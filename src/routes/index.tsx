import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CyberSense — Think Like a Defender" },
      { name: "description", content: "Hands-on cybersecurity training: spot phishing, respond to incidents and find vulnerable code." },
      { property: "og:title", content: "CyberSense — Think Like a Defender" },
      { property: "og:description", content: "Short, hands-on missions that build real security instincts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const MISSIONS = [
  { icon: "✉", name: "Phishing Investigator", text: "Inspect realistic emails and call out the red flags." },
  { icon: "⚡", name: "Incident Response Lab", text: "Make decisions in branching security incidents." },
  { icon: "{ }", name: "Secure Code Detective", text: "Find the vulnerability and learn the secure fix." },
];

function Landing() {
  const { session } = useAuth();
  return (
    <div className="space-y-14 py-6">
      <section className="max-w-3xl fade-up">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Cybersecurity training</p>
        <h1 className="mt-3 text-5xl font-bold sm:text-6xl">Think like a <span className="text-gradient">defender</span>.</h1>
        <p className="mt-4 text-lg text-muted-foreground">Short, hands-on missions that build real security instincts. Every scenario is fictional and safe to explore.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          {session ? (
            <Link to="/dashboard" className="rounded-lg bg-gradient-brand px-5 py-2.5 font-semibold text-primary-foreground">Go to dashboard →</Link>
          ) : (
            <>
              <Link to="/auth" search={{ mode: "signup" }} className="rounded-lg bg-gradient-brand px-5 py-2.5 font-semibold text-primary-foreground">Create free account</Link>
              <Link to="/auth" className="rounded-lg border px-5 py-2.5 font-medium hover:bg-accent">Sign in</Link>
            </>
          )}
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        {MISSIONS.map((m) => (
          <div key={m.name} className="panel p-5">
            <span className="grid size-10 place-items-center rounded-lg bg-accent font-mono text-primary">{m.icon}</span>
            <h2 className="mt-4 text-xl font-semibold">{m.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{m.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
