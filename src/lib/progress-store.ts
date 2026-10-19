import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { emptyProgress, type Attempt, type AssessmentResult, type MissionRecord, type Progress, type Skill } from "./types";

// Signed-in progress lives in Lovable Cloud (per-user, protected by row-level security).
// localStorage keeps a per-user cache so the dashboard renders instantly after a refresh.
const keyFor = (uid: string) => `cybersense-progress-v2-${uid}`;
const SERVER = emptyProgress();
let cache: Progress = emptyProgress();
let userId: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  if (userId) {
    try { localStorage.setItem(keyFor(userId), JSON.stringify(cache)); } catch { /* storage unavailable */ }
  }
  listeners.forEach((l) => l());
}

function readCache(uid: string): Progress {
  try {
    const raw = localStorage.getItem(keyFor(uid));
    const parsed = raw ? (JSON.parse(raw) as Progress) : null;
    if (parsed && parsed.version === 1 && Array.isArray(parsed.attempts)) return parsed;
  } catch { /* ignore */ }
  return emptyProgress();
}

export async function syncProgressUser(uid: string | null) {
  if (uid === userId) return;
  userId = uid;
  cache = uid ? readCache(uid) : emptyProgress();
  emit();
  if (!uid) return;
  const [a, m, s] = await Promise.all([
    supabase.from("attempts").select("skill,item_id,correct,points,max_points,created_at").order("created_at"),
    supabase.from("mission_completions").select("mission_key,skill,title,score,max_score,created_at").order("created_at"),
    supabase.from("assessments").select("kind,score,total,by_skill,created_at").order("created_at"),
  ]);
  if (userId !== uid || a.error || m.error || s.error) return;
  const assessments: Progress["assessments"] = {};
  for (const r of s.data) {
    assessments[r.kind as "pre" | "post"] = { score: r.score, total: r.total, bySkill: r.by_skill as AssessmentResult["bySkill"], ts: Date.parse(r.created_at) };
  }
  cache = {
    ...cache,
    attempts: a.data.map((r) => ({ skill: r.skill as Skill, itemId: r.item_id, correct: r.correct, points: r.points, maxPoints: r.max_points, ts: Date.parse(r.created_at) })),
    missions: m.data.map((r) => ({ id: r.mission_key, skill: r.skill as Skill, title: r.title, score: r.score, maxScore: r.max_score, ts: Date.parse(r.created_at) })),
    assessments,
  };
  emit();
}

export const progressActions = {
  addAttempt: (a: Omit<Attempt, "ts">) => {
    cache = { ...cache, attempts: [...cache.attempts, { ...a, ts: Date.now() }] };
    emit();
    if (userId) void supabase.from("attempts").insert({ skill: a.skill, item_id: a.itemId, correct: a.correct, points: a.points, max_points: a.maxPoints }).then(({ error }) => { if (error) console.error("Saving answer failed", error.message); });
  },
  addMission: (m: Omit<MissionRecord, "ts">) => {
    cache = { ...cache, missions: [...cache.missions, { ...m, ts: Date.now() }] };
    emit();
    if (userId) void supabase.from("mission_completions").insert({ mission_key: m.id, skill: m.skill, title: m.title, score: m.score, max_score: m.maxScore }).then(({ error }) => { if (error) console.error("Saving mission failed", error.message); });
  },
  setAssessment: (kind: "pre" | "post", r: AssessmentResult) => {
    cache = { ...cache, assessments: { ...cache.assessments, [kind]: r } };
    emit();
    if (userId) void supabase.from("assessments").insert({ kind, score: r.score, total: r.total, by_skill: r.bySkill }).then(({ error }) => { if (error) console.error("Saving assessment failed", error.message); });
  },
  reset: async () => {
    cache = emptyProgress();
    emit();
    if (userId) {
      await Promise.all([
        supabase.from("attempts").delete().eq("user_id", userId),
        supabase.from("mission_completions").delete().eq("user_id", userId),
        supabase.from("assessments").delete().eq("user_id", userId),
      ]);
    }
  },
};

export function useProgress(): Progress {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => cache,
    () => SERVER,
  );
}
