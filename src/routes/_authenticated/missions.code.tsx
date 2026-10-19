import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CODE_CHALLENGES } from "@/data/code";
import { difficultyFor, orderByDifficulty, scoreChoice } from "@/lib/engine";
import { progressActions, useProgress } from "@/lib/progress-store";
import { Feedback, MissionComplete, MissionHeader, OptionButton } from "@/components/mission-ui";

export const Route = createFileRoute("/_authenticated/missions/code")({
  head: () => ({
    meta: [
      { title: "Secure Code Detective — CyberSense" },
      { name: "description", content: "Spot vulnerabilities in fictional code and learn the secure fix." },
      { property: "og:title", content: "Secure Code Detective — CyberSense" },
      { property: "og:description", content: "Find the bug before attackers do." },
    ],
  }),
  component: CodeDetective,
});

function CodeBlock({ code, highlight = [], label }: { code: string; highlight?: number[]; label: string }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-code">
      <p className="border-b px-4 py-2 font-mono text-xs text-muted-foreground">{label}</p>
      <pre className="overflow-x-auto p-4 font-mono text-xs leading-6 sm:text-sm">
        {code.split("\n").map((l, k) => (
          <div key={k} className={highlight.includes(k + 1) ? "-mx-4 bg-destructive/20 px-4" : ""}>
            <span className="mr-4 inline-block w-5 select-none text-right text-muted-foreground">{k + 1}</span>{l}
          </div>
        ))}
      </pre>
    </div>
  );
}

function CodeDetective() {
  const p = useProgress();
  const [run, setRun] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const items = useMemo(() => orderByDifficulty(CODE_CHALLENGES, difficultyFor(p.attempts, "code")), [run]);
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const max = items.length * 10;
  const restart = () => { setRun((r) => r + 1); setI(0); setPick(null); setScore(0); };

  if (i >= items.length) return <MissionComplete score={score} max={max} onRestart={restart} lesson="Treat input as untrusted, use parameterised APIs, and keep secrets out of code." />;
  const c = items[i]!;
  const choose = (id: string) => {
    if (pick) return;
    const r = scoreChoice(id, c.answer);
    setPick(id); setScore((s) => s + r.points);
    progressActions.addAttempt({ skill: "code", itemId: c.id, correct: r.correct, points: r.points, maxPoints: 10 });
  };
  const next = () => {
    if (i + 1 >= items.length) progressActions.addMission({ id: `code-${Date.now()}`, skill: "code", title: "Secure Code Detective", score, maxScore: max });
    setI(i + 1); setPick(null);
  };
  const correct = pick === c.answer;

  return (
    <div>
      <MissionHeader kicker="Mission 03" title="Secure Code Detective" intro="Review each snippet and identify the main weakness. Code is display-only and never executed." step={i} total={items.length} score={score} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <div>
            <h2 className="text-xl font-semibold">{c.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{c.scenario}</p>
          </div>
          <CodeBlock code={c.vulnerable} highlight={pick ? c.evidenceLines : []} label="review.py" />
          {pick && <div className="fade-up"><CodeBlock code={c.safe} label="✓ secure fix" /></div>}
        </div>
        <aside>
          <p className="mb-3 text-sm font-medium">What's the main weakness?</p>
          <div className="space-y-2">
            {c.options.map((o) => (
              <OptionButton key={o.id} onClick={() => choose(o.id)} disabled={!!pick}
                state={pick === o.id ? (correct ? "picked-good" : "picked-bad") : pick && o.id === c.answer ? "answer" : undefined}>
                {o.label}
              </OptionButton>
            ))}
          </div>
          {pick && (
            <Feedback tone={correct ? "good" : "bad"} title={correct ? "Correct! +10" : "Not quite"}>
              <p className="font-mono text-xs">{c.cwe} · {c.cweName}</p>
              <p>{c.concept}</p>
              <p><span className="font-semibold">Why it's risky:</span> {c.why}</p>
              <p><span className="font-semibold">Takeaway:</span> {c.takeaway}</p>
            </Feedback>
          )}
          {pick && <button onClick={next} className="mt-4 w-full rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground">{i + 1 >= items.length ? "See results" : "Next snippet →"}</button>}
        </aside>
      </div>
    </div>
  );
}
