import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { z } from "zod";
import { PRE, POST, type AQuestion } from "@/data/assessment";
import { useProgress, progressActions } from "@/lib/progress-store";
import { assessmentGain, postUnlocked } from "@/lib/engine";
import { SKILLS, SKILL_LABEL, type AssessmentResult, type Skill } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/assessment")({
  validateSearch: z.object({ kind: z.enum(["pre", "post"]).optional() }),
  head: () => ({
    meta: [
      { title: "Skills assessment — CyberSense" },
      { name: "description", content: "Measure your security knowledge before and after training." },
      { property: "og:title", content: "Skills assessment — CyberSense" },
      { property: "og:description", content: "Pre- and post-training cybersecurity assessments." },
    ],
  }),
  component: AssessmentPage,
});

export function scoreAssessment(qs: AQuestion[], answers: Record<string, number>): Omit<AssessmentResult, "ts"> {
  const bySkill = Object.fromEntries(SKILLS.map((s) => [s, { correct: 0, total: 0 }])) as Record<Skill, { correct: number; total: number }>;
  let score = 0;
  for (const q of qs) {
    bySkill[q.skill].total++;
    if (answers[q.id] === q.answer) { bySkill[q.skill].correct++; score++; }
  }
  return { score, total: qs.length, bySkill };
}

function AssessmentPage() {
  const p = useProgress();
  const { kind } = Route.useSearch();
  if (kind === "pre" || (kind === "post" && postUnlocked(p))) return <Quiz kind={kind} />;
  const gain = assessmentGain(p);
  const unlocked = postUnlocked(p);

  return (
    <div className="space-y-6">
      <div className="fade-up">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Assessment</p>
        <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Measure your progress</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">Take the pre-training check first, complete missions, then take the post-training check to see your before-and-after results.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Pre-training" r={p.assessments.pre} cta={<Link to="/assessment" search={{ kind: "pre" }} className="rounded-md bg-gradient-brand px-4 py-2 text-sm font-semibold text-primary-foreground">{p.assessments.pre ? "Retake" : "Start"} pre-assessment</Link>} />
        <Card title="Post-training" r={p.assessments.post} cta={unlocked
          ? <Link to="/assessment" search={{ kind: "post" }} className="rounded-md bg-gradient-brand px-4 py-2 text-sm font-semibold text-primary-foreground">{p.assessments.post ? "Retake" : "Start"} post-assessment</Link>
          : <p className="text-sm text-muted-foreground">{p.assessments.pre ? "Complete at least one mission to unlock." : "Complete the pre-assessment first."}</p>} />
      </div>
      <section className="panel overflow-hidden">
        <h2 className="border-b p-4 text-lg font-semibold">Before vs after</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr><th className="p-3">Skill</th><th className="p-3">Before</th><th className="p-3">After</th><th className="p-3">Change</th></tr></thead>
          <tbody className="divide-y">
            {gain.map((g) => (
              <tr key={g.skill}>
                <td className="p-3">{SKILL_LABEL[g.skill]}</td>
                <td className="p-3 font-mono">{g.before === null ? "—" : `${g.before}%`}</td>
                <td className="p-3 font-mono">{g.after === null ? "—" : `${g.after}%`}</td>
                <td className={`p-3 font-mono ${g.change === null ? "" : g.change >= 0 ? "text-primary" : "text-destructive"}`}>{g.change === null ? "—" : `${g.change > 0 ? "+" : ""}${g.change} pts`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Card({ title, r, cta }: { title: string; r: AssessmentResult | undefined; cta: ReactNode }) {
  return (
    <div className="panel space-y-3 p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="font-display text-3xl font-bold">{r ? `${r.score}/${r.total}` : "—"}</p>
      <p className="text-xs text-muted-foreground">{r ? `Taken ${new Date(r.ts).toLocaleDateString()}` : "Not taken yet"}</p>
      {cta}
    </div>
  );
}

function Quiz({ kind }: { kind: "pre" | "post" }) {
  const qs = kind === "pre" ? PRE : POST;
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<Omit<AssessmentResult, "ts"> | null>(null);
  const done = Object.keys(answers).length === qs.length;

  const submit = () => {
    const r = scoreAssessment(qs, answers);
    progressActions.setAssessment(kind, { ...r, ts: Date.now() });
    setResult(r);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-primary">{kind === "pre" ? "Pre-training" : "Post-training"} assessment</p>
        <h1 className="mt-1 text-3xl font-bold">{result ? `You scored ${result.score}/${result.total}` : `${qs.length} questions`}</h1>
        {result && (
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            {SKILLS.map((s) => <span key={s} className="panel px-3 py-1.5">{SKILL_LABEL[s]}: {result.bySkill[s].correct}/{result.bySkill[s].total}</span>)}
            <Link to="/assessment" search={{}} className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground">See before vs after</Link>
            <Link to="/dashboard" className="rounded-md px-3 py-1.5 text-primary hover:underline">Your recommendations →</Link>
          </div>
        )}
      </div>
      <ol className="space-y-4">
        {qs.map((q, i) => (
          <li key={q.id} className="panel p-5">
            <p className="font-medium">{i + 1}. {q.q}</p>
            <div className="mt-3 grid gap-2">
              {q.options.map((o, oi) => {
                const picked = answers[q.id] === oi;
                const state = result ? (oi === q.answer ? "border-primary bg-accent" : picked ? "border-destructive" : "") : picked ? "border-primary bg-accent" : "";
                return (
                  <button key={oi} disabled={!!result} onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                    className={`rounded-md border px-3 py-2 text-left text-sm transition-colors hover:border-primary ${state}`}>{o}</button>
                );
              })}
            </div>
            {result && <p className="mt-3 text-sm text-muted-foreground">{q.explain}</p>}
          </li>
        ))}
      </ol>
      {!result && (
        <button disabled={!done} onClick={submit} className="rounded-md bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {done ? "Submit answers" : `Answer all questions (${Object.keys(answers).length}/${qs.length})`}
        </button>
      )}
    </div>
  );
}
