import { describe, expect, it } from "vitest";
import { assessmentGain, postUnlocked, recommendChallenges } from "@/lib/engine";
import { emptyProgress, type Progress } from "@/lib/types";

const bs = (p: number, i: number, c: number) => ({ phishing: { correct: p, total: 2 }, incident: { correct: i, total: 2 }, code: { correct: c, total: 2 } });

describe("assessments and recommendations", () => {
  it("post-assessment is locked until pre is done and a mission completed", () => {
    const p = emptyProgress();
    expect(postUnlocked(p)).toBe(false);
    p.assessments.pre = { score: 3, total: 6, bySkill: bs(1, 1, 1), ts: 1 };
    expect(postUnlocked(p)).toBe(false);
    p.missions.push({ id: "m", skill: "code", title: "t", score: 1, maxScore: 2, ts: 1 });
    expect(postUnlocked(p)).toBe(true);
  });

  it("computes per-skill before/after change", () => {
    const p: Progress = { ...emptyProgress(), assessments: { pre: { score: 2, total: 6, bySkill: bs(1, 1, 0), ts: 1 }, post: { score: 6, total: 6, bySkill: bs(2, 2, 2), ts: 2 } } };
    const code = assessmentGain(p).find((g) => g.skill === "code")!;
    expect(code).toMatchObject({ before: 0, after: 100, change: 100 });
  });

  it("ranks the weakest assessed skill first with foundational difficulty", () => {
    const p: Progress = { ...emptyProgress(), assessments: { pre: { score: 4, total: 6, bySkill: bs(2, 2, 0), ts: 1 } } };
    const recs = recommendChallenges(p);
    expect(recs).toHaveLength(3);
    expect(recs[0]!.skill).toBe("code");
    expect(recs[0]!.difficulty).toBe("foundational");
    expect(recs[0]!.reasons.length).toBeGreaterThan(1);
  });
});
