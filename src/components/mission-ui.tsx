import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Progress } from "@/components/ui/progress";

export function MissionHeader({ kicker, title, intro, step, total, score }: { kicker: string; title: string; intro: string; step: number; total: number; score: number }) {
  return (
    <div className="mb-6 fade-up">
      <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← Dashboard</Link>
      <p className="mt-4 font-mono text-xs uppercase tracking-widest text-primary">{kicker}</p>
      <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">{intro}</p>
      <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <Progress value={(step / total) * 100} className="h-2" />
        <span className="shrink-0 font-mono text-sm">{Math.min(step + 1, total)}/{total} · <span className="text-primary">{score} pts</span></span>
      </div>
    </div>
  );
}

export function Feedback({ tone, title, children }: { tone: "good" | "ok" | "bad"; title: string; children: ReactNode }) {
  const cls = tone === "good" ? "border-success/50 bg-success/10" : tone === "ok" ? "border-warning/50 bg-warning/10" : "border-destructive/50 bg-destructive/10";
  const tc = tone === "good" ? "text-success" : tone === "ok" ? "text-warning" : "text-destructive";
  return (
    <div className={`mt-4 rounded-xl border p-4 fade-up ${cls}`}>
      <p className={`font-display font-semibold ${tc}`}>{title}</p>
      <div className="mt-2 space-y-2 text-sm">{children}</div>
    </div>
  );
}

export function MissionComplete({ score, max, onRestart, lesson }: { score: number; max: number; onRestart: () => void; lesson: string }) {
  const pct = Math.round((score / max) * 100);
  return (
    <div className="panel mx-auto max-w-xl p-8 text-center fade-up">
      <p className="font-mono text-xs uppercase tracking-widest text-primary">Mission complete</p>
      <p className="mt-3 font-display text-6xl font-bold text-gradient">{pct}%</p>
      <p className="mt-2 text-muted-foreground">{score} of {max} points</p>
      <p className="mt-4 text-sm">{lesson}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button onClick={onRestart} className="rounded-md border px-4 py-2 text-sm hover:bg-accent">Play again</button>
        <Link to="/dashboard" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Back to dashboard</Link>
      </div>
    </div>
  );
}

export function OptionButton({ children, onClick, disabled, state }: { children: ReactNode; onClick: () => void; disabled?: boolean; state?: "picked-good" | "picked-ok" | "picked-bad" | "answer" | undefined }) {
  const s = state === "picked-good" || state === "answer" ? "border-success bg-success/10" : state === "picked-ok" ? "border-warning bg-warning/10" : state === "picked-bad" ? "border-destructive bg-destructive/10" : "hover:border-primary hover:bg-accent";
  return (
    <button onClick={onClick} disabled={disabled} className={`w-full rounded-xl border bg-surface p-4 text-left text-sm transition-colors disabled:cursor-default ${s}`}>
      {children}
    </button>
  );
}
