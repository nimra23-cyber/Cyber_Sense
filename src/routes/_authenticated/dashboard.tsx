import { createFileRoute, Link } from "@tanstack/react-router";
import { useProgress, progressActions } from "@/lib/progress-store";
import { badges, overallScore, recommendChallenges, skillStats, streak } from "@/lib/engine";
import { SKILLS, SKILL_LABEL, SKILL_MISSION, type Skill } from "@/lib/types";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — CyberSense" },
      { name: "description", content: "Track your cybersecurity training progress, scores and badges." },
      { property: "og:title", content: "Dashboard — CyberSense" },
      { property: "og:description", content: "Your defender training progress at a glance." },
    ],
  }),
  component: Dashboard,
});

const BLURB: Record<Skill, string> = {
  phishing: "Inspect realistic emails and decide: legitimate, suspicious or phishing.",
  incident: "Make decisions under pressure in branching security incidents.",
  code: "Find the vulnerability in real-looking code and learn the secure fix.",
};
const ICON: Record<Skill, string> = { phishing: "✉", incident: "⚡", code: "{ }" };

function Dashboard() {
  const p = useProgress();
  const overall = overallScore(p.attempts);
  const recs = recommendChallenges(p);
  const points = p.attempts.reduce((a, b) => a + b.points, 0);
  const earned = badges(p);

  return (
    <div className="space-y-8">
      <section className="fade-up">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Defender console</p>
        <h1 className="mt-2 text-4xl font-bold sm:text-5xl">Think like a <span className="text-gradient">defender</span>.</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">Short, hands-on missions that build real security instincts. Every scenario is fictional and safe.</p>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Overall accuracy", overall === null ? "—" : `${overall}%`],
          ["Total points", points],
          ["Missions done", p.missions.length],
          ["Day streak", streak(p.attempts)],
        ].map(([k, v]) => (
          <div key={k} className="panel p-4">
            <p className="text-xs text-muted-foreground">{k}</p>
            <p className="mt-1 font-display text-3xl font-bold">{v}</p>
          </div>
        ))}
      </section>

      {!p.assessments.pre && (
        <section className="panel flex flex-wrap items-center justify-between gap-4 border-primary/40 p-5">
          <div>
            <p className="font-display text-lg font-semibold">Start with the pre-training assessment</p>
            <p className="text-sm text-muted-foreground">6 quick questions so recommendations match what you already know.</p>
          </div>
          <Link to="/assessment" search={{ kind: "pre" }} className="rounded-md bg-gradient-brand px-4 py-2 text-sm font-semibold text-primary-foreground">Take assessment →</Link>
        </section>
      )}

      <section className="panel border-primary/40 p-5">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Recommended challenges</p>
        <ol className="mt-3 divide-y">
          {recs.map((r, i) => (
            <li key={r.skill} className="flex flex-wrap items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="font-display text-lg font-semibold">{i + 1}. {SKILL_MISSION[r.skill].name} <span className="ml-1 text-sm font-normal capitalize text-muted-foreground">· {r.difficulty} · priority {r.priority}</span></p>
                <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
                  {r.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                </ul>
              </div>
              <Link to={SKILL_MISSION[r.skill].to} className="shrink-0 rounded-md bg-gradient-brand px-4 py-2 text-sm font-semibold text-primary-foreground">Start →</Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {SKILLS.map((s) => {
          const st = skillStats(p.attempts, s);
          const best = Math.max(0, ...p.missions.filter((m) => m.skill === s).map((m) => Math.round((m.score / m.maxScore) * 100)));
          return (
            <Link key={s} to={SKILL_MISSION[s].to} className="panel group flex flex-col p-5 transition-colors hover:border-primary">
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-lg bg-accent font-mono text-primary">{ICON[s]}</span>
                <span className="text-xs text-muted-foreground">{SKILL_LABEL[s]}</span>
              </div>
              <h2 className="mt-4 text-xl font-semibold">{SKILL_MISSION[s].name}</h2>
              <p className="mt-1 flex-1 text-sm text-muted-foreground">{BLURB[s]}</p>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs"><span>Accuracy</span><span className="font-mono">{st.accuracy === null ? "—" : `${Math.round(st.accuracy * 100)}%`}</span></div>
                <Progress value={(st.accuracy ?? 0) * 100} className="h-1.5" />
                <p className="text-xs text-muted-foreground">{st.attempts} answers · best mission {best}%</p>
              </div>
              <span className="mt-4 text-sm font-medium text-primary group-hover:underline">Open mission →</span>
            </Link>
          );
        })}
      </section>

      <section>
        <h2 className="text-xl font-semibold">Badges</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {earned.map((b) => (
            <div key={b.id} className={`panel p-4 ${b.earned ? "border-success/50" : "opacity-50"}`}>
              <p className="font-semibold">{b.earned ? "🏅 " : "🔒 "}{b.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{b.description}</p>
            </div>
          ))}
        </div>
      </section>

      {p.missions.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold">Recent missions</h2>
          <ul className="panel mt-3 divide-y">
            {[...p.missions].reverse().slice(0, 6).map((m) => (
              <li key={m.ts} className="flex justify-between gap-3 px-4 py-3 text-sm">
                <span className="min-w-0 truncate">{m.title}</span>
                <span className="shrink-0 font-mono">{m.score}/{m.maxScore}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => { if (confirm("Reset all progress?")) void progressActions.reset(); }}
            className="mt-3 text-xs text-muted-foreground underline hover:text-destructive"
          >Reset progress</button>
        </section>
      )}
    </div>
  );
}
