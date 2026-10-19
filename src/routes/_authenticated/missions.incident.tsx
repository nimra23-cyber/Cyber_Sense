import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { INCIDENTS, type IROption, type IRScenario } from "@/data/incidents";
import { scoreDecision } from "@/lib/engine";
import { progressActions } from "@/lib/progress-store";
import { Feedback, MissionComplete, MissionHeader, OptionButton } from "@/components/mission-ui";

export const Route = createFileRoute("/_authenticated/missions/incident")({
  head: () => ({
    meta: [
      { title: "Incident Response Lab — CyberSense" },
      { name: "description", content: "Make decisions in branching, fictional security incidents." },
      { property: "og:title", content: "Incident Response Lab — CyberSense" },
      { property: "og:description", content: "Contain, investigate and escalate like a SOC analyst." },
    ],
  }),
  component: IncidentLab,
});

function IncidentLab() {
  const [sc, setSc] = useState<IRScenario | null>(null);
  if (!sc) {
    return (
      <div>
        <MissionHeader kicker="Mission 02" title="Incident Response Lab" intro="Pick a scenario. Each decision changes what happens next." step={0} total={1} score={0} />
        <div className="grid gap-4 md:grid-cols-2">
          {INCIDENTS.map((s) => (
            <button key={s.id} onClick={() => setSc(s)} className="panel p-5 text-left transition-colors hover:border-primary">
              <p className="font-mono text-xs text-primary">{s.role}</p>
              <h2 className="mt-2 text-xl font-semibold">{s.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{s.summary}</p>
              <p className="mt-4 text-sm font-medium text-primary">Start scenario →</p>
            </button>
          ))}
        </div>
      </div>
    );
  }
  return <Scenario key={sc.id} sc={sc} onExit={() => setSc(null)} />;
}

function Scenario({ sc, onExit }: { sc: IRScenario; onExit: () => void }) {
  const [stepId, setStepId] = useState<string | undefined>(sc.start);
  const [pick, setPick] = useState<IROption | null>(null);
  const [score, setScore] = useState(0);
  const [count, setCount] = useState(0);
  const [log, setLog] = useState<{ q: string; a: IROption }[]>([]);
  const total = Object.keys(sc.steps).length;

  if (!stepId) {
    return (
      <div className="space-y-6">
        <MissionComplete score={score} max={count * 10} onRestart={onExit} lesson="Investigate before acting, contain fast, preserve evidence, and escalate." />
        <div className="panel mx-auto max-w-xl p-5">
          <p className="font-semibold">Your incident timeline</p>
          <ol className="mt-3 space-y-3 text-sm">
            {log.map((l, k) => (
              <li key={k} className="border-l-2 pl-3" style={{ borderColor: `var(--${l.a.quality === "best" ? "success" : l.a.quality === "ok" ? "warning" : "destructive"})` }}>
                <p className="text-muted-foreground">{l.q}</p><p>{l.a.label}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    );
  }
  const step = sc.steps[stepId]!;
  const choose = (o: IROption) => {
    if (pick) return;
    const r = scoreDecision(o.quality);
    setPick(o); setScore((s) => s + r.points); setCount((c) => c + 1);
    setLog((l) => [...l, { q: step.prompt, a: o }]);
    progressActions.addAttempt({ skill: "incident", itemId: `${sc.id}-${step.id}`, correct: r.correct, points: r.points, maxPoints: 10 });
  };
  const next = () => {
    if (!pick!.next) progressActions.addMission({ id: `${sc.id}-${Date.now()}`, skill: "incident", title: sc.title, score, maxScore: count * 10 });
    setStepId(pick!.next); setPick(null);
  };

  return (
    <div>
      <MissionHeader kicker={`Mission 02 · ${sc.role}`} title={sc.title} intro={sc.summary} step={count} total={total} score={score} />
      <div className="panel mx-auto max-w-3xl p-5 sm:p-6">
        {step.detail && <p className="mb-3 rounded-md bg-code px-3 py-2 font-mono text-xs text-success">{step.detail}</p>}
        <h2 className="text-xl font-semibold">{step.prompt}</h2>
        <div className="mt-4 space-y-2">
          {step.options.map((o) => (
            <OptionButton key={o.label} onClick={() => choose(o)} disabled={!!pick}
              state={pick === o ? (o.quality === "best" ? "picked-good" : o.quality === "ok" ? "picked-ok" : "picked-bad") : pick && o.quality === "best" ? "answer" : undefined}>
              {o.label}
            </OptionButton>
          ))}
        </div>
        {pick && (
          <>
            <Feedback tone={pick.quality === "best" ? "good" : pick.quality === "ok" ? "ok" : "bad"} title={pick.quality === "best" ? "Best response +10" : pick.quality === "ok" ? "Acceptable +5" : "Harmful choice +0"}>
              <p>{pick.consequence}</p>
            </Feedback>
            <button onClick={next} className="mt-4 w-full rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground">{pick.next ? "Continue →" : "Finish scenario"}</button>
          </>
        )}
      </div>
    </div>
  );
}
