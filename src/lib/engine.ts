// Pure, deterministic scoring + rule-based adaptive learning logic. No AI model involved.
import { SKILLS, SKILL_LABEL, type Attempt, type Difficulty, type Progress, type Skill } from "./types";

export const MIN_ATTEMPTS = 3;

export type PhishVerdict = "legitimate" | "suspicious" | "phishing";

/** Exact match = 10. Calling a phishing email "suspicious" (or vice versa) = 5 partial. Otherwise 0. */
export function scorePhishing(answer: PhishVerdict, correct: PhishVerdict): { points: number; correct: boolean } {
  if (answer === correct) return { points: 10, correct: true };
  const cautious = new Set<PhishVerdict>(["suspicious", "phishing"]);
  if (cautious.has(answer) && cautious.has(correct)) return { points: 5, correct: false };
  return { points: 0, correct: false };
}

/** Incident decisions: best = 10, acceptable = 5, harmful = 0. Correct only when best. */
export function scoreDecision(quality: "best" | "ok" | "poor") {
  return { points: quality === "best" ? 10 : quality === "ok" ? 5 : 0, correct: quality === "best" };
}

export function scoreChoice(answer: string, correct: string) {
  return { points: answer === correct ? 10 : 0, correct: answer === correct };
}

export function skillStats(attempts: Attempt[], skill: Skill) {
  const list = attempts.filter((a) => a.skill === skill);
  const correct = list.filter((a) => a.correct).length;
  return { attempts: list.length, correct, accuracy: list.length ? correct / list.length : null };
}

/** Overall score = average accuracy of skills with at least one attempt. Null when no data. */
export function overallScore(attempts: Attempt[]): number | null {
  const accs = SKILLS.map((s) => skillStats(attempts, s).accuracy).filter((a): a is number => a !== null);
  if (!accs.length) return null;
  return Math.round((accs.reduce((a, b) => a + b, 0) / accs.length) * 100);
}

/** Last 3 correct in a row => advanced. Last 2 wrong in a row => foundational. Otherwise standard. */
export function difficultyFor(attempts: Attempt[], skill: Skill): Difficulty {
  const list = attempts.filter((a) => a.skill === skill);
  const last3 = list.slice(-3);
  if (last3.length === 3 && last3.every((a) => a.correct)) return "advanced";
  const last2 = list.slice(-2);
  if (last2.length === 2 && last2.every((a) => !a.correct)) return "foundational";
  return "standard";
}

export interface Recommendation {
  skill: Skill;
  reason: string;
  difficulty: Difficulty;
}

export function recommend(progress: Progress): Recommendation {
  const { attempts } = progress;
  const stats = SKILLS.map((s) => ({ skill: s, ...skillStats(attempts, s) }));
  const sufficient = stats.filter((s) => s.attempts >= MIN_ATTEMPTS);
  const insufficient = stats.filter((s) => s.attempts < MIN_ATTEMPTS);

  if (!attempts.length) {
    return { skill: "phishing", difficulty: "standard", reason: "No activity yet. Phishing Investigator is the best starting point — most real-world attacks begin with an email." };
  }
  if (sufficient.length) {
    const weakest = [...sufficient].sort((a, b) => (a.accuracy! - b.accuracy!) || a.attempts - b.attempts)[0]!;
    const pct = Math.round(weakest.accuracy! * 100);
    // If weakest is strong and some skill is untried, explore it.
    if (weakest.accuracy! >= 0.8 && insufficient.length) {
      const next = [...insufficient].sort((a, b) => a.attempts - b.attempts)[0]!;
      return { skill: next.skill, difficulty: difficultyFor(attempts, next.skill), reason: `You're at ${pct}%+ in tested skills. ${SKILL_LABEL[next.skill]} has only ${next.attempts} of ${MIN_ATTEMPTS} attempts needed to measure it.` };
    }
    return { skill: weakest.skill, difficulty: difficultyFor(attempts, weakest.skill), reason: `${SKILL_LABEL[weakest.skill]} is your weakest measured skill at ${pct}% accuracy across ${weakest.attempts} answers.` };
  }
  const next = [...insufficient].sort((a, b) => a.attempts - b.attempts)[0]!;
  return { skill: next.skill, difficulty: difficultyFor(attempts, next.skill), reason: `Not enough data yet: ${SKILL_LABEL[next.skill]} has ${next.attempts} of ${MIN_ATTEMPTS} attempts needed for a reliable measurement.` };
}

const dayKey = (ts: number) => new Date(ts).toLocaleDateString("en-CA");

/** Consecutive active days ending today (or yesterday). */
export function streak(attempts: Attempt[], now = Date.now()): number {
  const days = new Set(attempts.map((a) => dayKey(a.ts)));
  let d = new Date(now);
  if (!days.has(dayKey(d.getTime()))) d = new Date(now - 86400000);
  let n = 0;
  while (days.has(dayKey(d.getTime()))) { n++; d = new Date(d.getTime() - 86400000); }
  return n;
}

/** Order items by preferred difficulty: foundational first when struggling, advanced first when strong. */
export function orderByDifficulty<T extends { level: 1 | 2 | 3 }>(items: T[], diff: Difficulty): T[] {
  const sorted = [...items].sort((a, b) => a.level - b.level);
  return diff === "advanced" ? sorted.reverse() : sorted;
}

export interface Badge { id: string; name: string; description: string; earned: boolean }

export function badges(p: Progress): Badge[] {
  const best = (skill: Skill) => Math.max(0, ...p.missions.filter((m) => m.skill === skill).map((m) => m.score / m.maxScore));
  return [
    { id: "first", name: "First Mission", description: "Complete any mission", earned: p.missions.length > 0 },
    { id: "phish", name: "Phish Spotter", description: "Score 80%+ in Phishing Investigator", earned: best("phishing") >= 0.8 },
    { id: "ir", name: "Calm Responder", description: "Score 80%+ in an incident scenario", earned: best("incident") >= 0.8 },
    { id: "code", name: "Code Detective", description: "Score 80%+ in Secure Code Detective", earned: best("code") >= 0.8 },
    { id: "all", name: "Well-Rounded", description: "Complete a mission in every skill", earned: SKILLS.every((s) => p.missions.some((m) => m.skill === s)) },
    { id: "assess", name: "Reflective Learner", description: "Complete both assessments", earned: !!(p.assessments.pre && p.assessments.post) },
  ];
}

export interface ChallengeRec {
  skill: Skill;
  difficulty: Difficulty;
  priority: number; // 0-100, higher = more urgent
  reasons: string[];
}

/**
 * Ranked, multi-signal recommendations. Blends (deterministically):
 * - latest assessment score per skill (post if taken, else pre),
 * - mission answer accuracy per skill,
 * - recent mistakes (last 5 answers in the skill),
 * - untested skills. Returns every skill, most urgent first.
 */
export function recommendChallenges(p: Progress): ChallengeRec[] {
  const latest = p.assessments.post ?? p.assessments.pre;
  const recs = SKILLS.map((skill): ChallengeRec => {
    const reasons: string[] = [];
    const st = skillStats(p.attempts, skill);
    const recent = p.attempts.filter((a) => a.skill === skill).slice(-5);
    const recentWrong = recent.filter((a) => !a.correct).length;
    const a = latest?.bySkill?.[skill];
    const assessPct = a && a.total ? a.correct / a.total : null;

    // Weakness 0..1 from each available signal; missing signals are skipped.
    const parts: { w: number; v: number }[] = [];
    if (assessPct !== null) {
      parts.push({ w: 0.4, v: 1 - assessPct });
      reasons.push(`${p.assessments.post ? "Post" : "Pre"}-assessment: ${a!.correct}/${a!.total} correct in ${SKILL_LABEL[skill]}.`);
    }
    if (st.accuracy !== null && st.attempts >= MIN_ATTEMPTS) {
      parts.push({ w: 0.4, v: 1 - st.accuracy });
      reasons.push(`Mission accuracy ${Math.round(st.accuracy * 100)}% across ${st.attempts} answers.`);
    } else {
      parts.push({ w: 0.25, v: 0.6 });
      reasons.push(st.attempts ? `Only ${st.attempts} of ${MIN_ATTEMPTS} answers so far — not yet measured.` : "Not practised yet.");
    }
    if (recent.length) {
      parts.push({ w: 0.2, v: recentWrong / recent.length });
      if (recentWrong) reasons.push(`${recentWrong} mistake${recentWrong > 1 ? "s" : ""} in your last ${recent.length} answers.`);
    }
    const wsum = parts.reduce((s, x) => s + x.w, 0);
    const weakness = parts.reduce((s, x) => s + x.w * x.v, 0) / wsum;

    let difficulty = difficultyFor(p.attempts, skill);
    if (!st.attempts && assessPct !== null) difficulty = assessPct < 0.5 ? "foundational" : assessPct === 1 ? "advanced" : "standard";
    reasons.push(`Suggested level: ${difficulty}.`);
    return { skill, difficulty, priority: Math.round(weakness * 100), reasons };
  });
  return recs.sort((x, y) => y.priority - x.priority || SKILLS.indexOf(x.skill) - SKILLS.indexOf(y.skill));
}

/** Per-skill before/after comparison; null when either assessment is missing for that skill. */
export function assessmentGain(p: Progress) {
  const { pre, post } = p.assessments;
  return SKILLS.map((skill) => {
    const b = pre?.bySkill?.[skill];
    const a = post?.bySkill?.[skill];
    const before = b && b.total ? Math.round((b.correct / b.total) * 100) : null;
    const after = a && a.total ? Math.round((a.correct / a.total) * 100) : null;
    return { skill, before, after, change: before !== null && after !== null ? after - before : null };
  });
}

/** Post-assessment unlocks once the pre-assessment is done and at least one mission is completed. */
export function postUnlocked(p: Progress) {
  return !!p.assessments.pre && p.missions.length > 0;
}
