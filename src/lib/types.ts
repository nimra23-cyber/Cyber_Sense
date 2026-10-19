export type Skill = "phishing" | "incident" | "code";
export type Difficulty = "foundational" | "standard" | "advanced";

export const SKILLS: Skill[] = ["phishing", "incident", "code"];
export const SKILL_LABEL: Record<Skill, string> = {
  phishing: "Phishing Detection",
  incident: "Incident Response",
  code: "Secure Coding",
};
export const SKILL_MISSION: Record<Skill, { to: "/missions/phishing" | "/missions/incident" | "/missions/code"; name: string }> = {
  phishing: { to: "/missions/phishing", name: "Phishing Investigator" },
  incident: { to: "/missions/incident", name: "Incident Response Lab" },
  code: { to: "/missions/code", name: "Secure Code Detective" },
};

export interface Attempt {
  skill: Skill;
  itemId: string;
  correct: boolean;
  points: number;
  maxPoints: number;
  ts: number;
}

export interface MissionRecord {
  id: string;
  skill: Skill;
  title: string;
  score: number;
  maxScore: number;
  ts: number;
}

export interface AssessmentResult {
  score: number;
  total: number;
  bySkill: Record<Skill, { correct: number; total: number }>;
  ts: number;
}

export interface Progress {
  version: 1;
  attempts: Attempt[];
  missions: MissionRecord[];
  assessments: { pre?: AssessmentResult; post?: AssessmentResult };
}

export const emptyProgress = (): Progress => ({ version: 1, attempts: [], missions: [], assessments: {} });
