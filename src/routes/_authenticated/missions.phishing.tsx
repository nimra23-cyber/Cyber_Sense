import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PHISHING_EMAILS } from "@/data/phishing";
import { difficultyFor, orderByDifficulty, scorePhishing, type PhishVerdict } from "@/lib/engine";
import { progressActions, useProgress } from "@/lib/progress-store";
import { Feedback, MissionComplete, MissionHeader, OptionButton } from "@/components/mission-ui";

export const Route = createFileRoute("/_authenticated/missions/phishing")({
  head: () => ({
    meta: [
      { title: "Phishing Investigator — CyberSense" },
      { name: "description", content: "Inspect fictional emails and spot phishing red flags." },
      { property: "og:title", content: "Phishing Investigator — CyberSense" },
      { property: "og:description", content: "Can you tell a phish from a real email?" },
    ],
  }),
  component: Phishing,
});

const VERDICTS: { id: PhishVerdict; label: string }[] = [
  { id: "legitimate", label: "✓ Legitimate" },
  { id: "suspicious", label: "? Suspicious" },
  { id: "phishing", label: "⚠ Phishing" },
];

function Phishing() {
  const p = useProgress();
  const [run, setRun] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const emails = useMemo(() => orderByDifficulty(PHISHING_EMAILS, difficultyFor(p.attempts, "phishing")), [run]);
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<PhishVerdict | null>(null);
  const [hint, setHint] = useState(false);
  const [score, setScore] = useState(0);
  const max = emails.length * 10;
  const restart = () => { setRun((r) => r + 1); setI(0); setPick(null); setScore(0); setHint(false); };

  if (i >= emails.length) return <MissionComplete score={score} max={max} onRestart={restart} lesson="Check the real sender domain, hover before you click, and distrust urgency." />;
  const e = emails[i]!;

  const answer = (v: PhishVerdict) => {
    if (pick) return;
    const r = scorePhishing(v, e.answer);
    setPick(v); setScore((s) => s + r.points);
    progressActions.addAttempt({ skill: "phishing", itemId: e.id, correct: r.correct, points: r.points, maxPoints: 10 });
  };
  const next = () => {
    if (i + 1 >= emails.length) progressActions.addMission({ id: `phish-${Date.now()}`, skill: "phishing", title: "Phishing Investigator", score, maxScore: max });
    setI(i + 1); setPick(null); setHint(false);
  };
  const result = pick ? scorePhishing(pick, e.answer) : null;

  return (
    <div>
      <MissionHeader kicker="Mission 01" title="Phishing Investigator" intro="Read each email like an analyst. Decide whether it is legitimate, suspicious or phishing." step={i} total={emails.length} score={score} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <article className="panel overflow-hidden">
          <div className="border-b bg-surface p-4 text-sm">
            <p className="font-display text-lg font-semibold">{e.subject}</p>
            <p className="mt-2 break-all"><span className="text-muted-foreground">From:</span> {e.fromName} <span className="font-mono text-primary">&lt;{e.fromAddress}&gt;</span></p>
            <p className="text-muted-foreground">{e.received}</p>
          </div>
          <div className="space-y-3 p-5 text-sm leading-relaxed">
            {e.body.map((b, k) => <p key={k}>{b}</p>)}
            {e.linkText && (
              <p>
                <span title={e.linkTarget} className="inline-block cursor-help rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground">{e.linkText}</span>
                <span className="mt-1 block break-all font-mono text-xs text-muted-foreground">Link points to: {e.linkTarget}</span>
              </p>
            )}
            {e.attachment && <p className="inline-block rounded-md border px-3 py-1.5 font-mono text-xs">📎 {e.attachment}</p>}
          </div>
          <p className="border-t px-5 py-3 text-xs text-muted-foreground">Context: {e.context}</p>
        </article>

        <aside>
          <p className="mb-3 text-sm font-medium">Your verdict</p>
          <div className="space-y-2">
            {VERDICTS.map((v) => (
              <OptionButton key={v.id} onClick={() => answer(v.id)} disabled={!!pick}
                state={pick === v.id ? (result!.correct ? "picked-good" : result!.points ? "picked-ok" : "picked-bad") : pick && v.id === e.answer ? "answer" : undefined}>
                {v.label}
              </OptionButton>
            ))}
          </div>
          {!pick && (hint ? <p className="mt-3 rounded-lg bg-accent p-3 text-sm">💡 {e.hint}</p> : <button onClick={() => setHint(true)} className="mt-3 text-sm text-primary hover:underline">Need a hint?</button>)}
          {pick && result && (
            <Feedback tone={result.correct ? "good" : result.points ? "ok" : "bad"} title={result.correct ? "Correct! +10" : result.points ? `Close — it's ${e.answer}. +5` : `Not quite — it's ${e.answer}.`}>
              <p>{e.explanation}</p>
              <ul className="list-disc space-y-1 pl-5">{e.evidence.map((x) => <li key={x}>{x}</li>)}</ul>
              <p><span className="font-semibold">What to do:</span> {e.recommendation}</p>
            </Feedback>
          )}
          {pick && <button onClick={next} className="mt-4 w-full rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground">{i + 1 >= emails.length ? "See results" : "Next email →"}</button>}
        </aside>
      </div>
    </div>
  );
}
