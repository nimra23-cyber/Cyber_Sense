import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SKILL_LABEL, type Skill } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/admin")({
  // Access is checked in AdminGate (with loading/error states); every admin function re-checks the role in the database.
  head: () => ({
    meta: [
      { title: "Admin analytics — CyberSense" },
      { name: "description", content: "Usage analytics for CyberSense administrators." },
      { property: "og:title", content: "Admin analytics — CyberSense" },
      { property: "og:description", content: "Admin-only usage analytics." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminGate,
});

interface Analytics {
  total_users: number;
  login_events: number;
  unique_login_users: number;
  signups_7d: number;
  total_completions: number;
  recent_signups: { full_name: string; email: string | null; created_at: string }[];
  daily_logins: { day: string; events: number; users: number }[];
  missions: { skill: Skill; completions: number; users: number; avg_pct: number }[];
}

interface AdminUser {
  id: string;
  full_name: string;
  email: string | null;
  created_at: string;
  email_verified: boolean;
  last_sign_in_at: string | null;
  login_count: number;
  mission_count: number;
  attempt_count: number;
}

interface LoginRow {
  id: string;
  user_id: string;
  created_at: string;
  full_name: string | null;
  email: string | null;
}

interface UserProgress {
  profile: { id: string; full_name: string; email: string | null; created_at: string } | null;
  missions: { mission_key: string; skill: Skill; title: string; score: number; max_score: number; created_at: string }[];
  attempts: { skill: Skill; item_id: string; correct: boolean; points: number; max_points: number; created_at: string }[];
  assessments: { kind: "pre" | "post"; score: number; total: number; by_skill: Record<string, { correct: number; total: number }>; created_at: string }[];
}

type Tab = "overview" | "users" | "logins";
const PAGE_SIZE = 10;

type FnName = "admin_analytics" | "admin_logins" | "admin_user_progress" | "admin_users";

async function rpc<T>(name: FnName, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name, args ?? {});
  if (error) throw error;
  return data as unknown as T;
}

type Access = { isAdmin: boolean; adminExists: boolean; emailConfirmed: boolean };

async function loadAccess(): Promise<Access> {
  const { data: u, error: ue } = await supabase.auth.getUser();
  if (ue || !u.user) throw ue ?? new Error("Not signed in");
  const [role, exists] = await Promise.all([
    supabase.rpc("has_role", { _user_id: u.user.id, _role: "admin" }),
    supabase.rpc("admin_exists"),
  ]);
  if (role.error) throw role.error;
  if (exists.error) throw exists.error;
  return { isAdmin: !!role.data, adminExists: !!exists.data, emailConfirmed: !!u.user.email_confirmed_at };
}

function AdminGate() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-access"], queryFn: loadAccess, retry: 1 });
  const [claiming, setClaiming] = useState(false);
  const [claimMsg, setClaimMsg] = useState<string | null>(null);

  if (q.isLoading) return <p className="text-muted-foreground">Checking admin access…</p>;
  if (q.error || !q.data) {
    return (
      <div className="panel space-y-3 p-6">
        <p className="text-destructive">Couldn't check admin access: {(q.error as Error | null)?.message ?? "unknown error"}</p>
        <button onClick={() => void q.refetch()} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Try again</button>
      </div>
    );
  }
  if (q.data.isAdmin) return <Admin />;

  const claim = async () => {
    setClaiming(true);
    setClaimMsg(null);
    const { data, error } = await supabase.rpc("claim_first_admin");
    setClaiming(false);
    if (error) return setClaimMsg(error.message);
    if (!data) return setClaimMsg("Admin access could not be claimed. An admin may already exist, or your email isn't confirmed yet.");
    await qc.invalidateQueries({ queryKey: ["admin-access"] });
    window.location.reload();
  };

  return (
    <div className="panel max-w-xl space-y-3 p-6">
      <h1 className="text-2xl font-bold">Admin access required</h1>
      {!q.data.adminExists ? (
        <>
          <p className="text-sm text-muted-foreground">No admin has been set up yet. The first signed-in account with a confirmed email can claim admin access. Once claimed, this option disappears for everyone.</p>
          {!q.data.emailConfirmed && <p className="text-sm text-destructive">Confirm your email first, then sign in again.</p>}
          <button disabled={claiming || !q.data.emailConfirmed} onClick={() => void claim()} className="rounded-md bg-gradient-brand px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {claiming ? "Claiming…" : "Make me the admin"}
          </button>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Your account doesn't have admin access. Ask an existing admin to grant it.</p>
      )}
      {claimMsg && <p className="text-sm text-destructive">{claimMsg}</p>}
      <Link to="/dashboard" className="block text-sm text-primary hover:underline">Back to dashboard</Link>
    </div>
  );
}

function Admin() {
  const [tab, setTab] = useState<Tab>("overview");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  return (
    <div className="space-y-8">
      <div className="fade-up">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Admin only</p>
        <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Analytics</h1>
      </div>

      <nav className="flex gap-2 border-b">
        {(["overview", "users", "logins"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setSelectedUser(null); }}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === "overview" && <Overview />}
      {tab === "users" && (selectedUser ? <UserDetail user={selectedUser} onBack={() => setSelectedUser(null)} /> : <Users onSelect={setSelectedUser} />)}
      {tab === "logins" && <Logins />}
    </div>
  );
}

/* ---------------- Overview (existing stats) ---------------- */

function Overview() {
  const q = useQuery({ queryKey: ["admin-analytics"], queryFn: () => rpc<Analytics>("admin_analytics") });

  if (q.isLoading) return <p className="text-muted-foreground">Loading analytics…</p>;
  if (q.error || !q.data) return <p className="text-destructive">Couldn't load analytics. You may not have admin access.</p>;
  const a = q.data;
  const peak = Math.max(1, ...a.daily_logins.map((d) => d.events));

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Registered accounts" value={a.total_users} note={`${a.signups_7d} new in last 7 days`} />
        <Stat label="Successful login events" value={a.login_events} note="Every sign-in counted" />
        <Stat label="Unique users who logged in" value={a.unique_login_users} note="Each person counted once" />
        <Stat label="Mission completions" value={a.total_completions} note="All users, all missions" />
      </section>

      <section className="panel p-5">
        <h2 className="text-lg font-semibold">Daily login activity <span className="text-sm font-normal text-muted-foreground">· last 14 days</span></h2>
        <div className="mt-4 flex h-40 items-end gap-1.5">
          {a.daily_logins.map((d) => (
            <div key={d.day} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${d.day}: ${d.events} logins, ${d.users} users`}>
              <span className="font-mono text-[10px] text-muted-foreground">{d.events || ""}</span>
              <div className="w-full rounded-t bg-gradient-brand" style={{ height: `${(d.events / peak) * 100}%`, minHeight: d.events ? 4 : 1 }} />
              <span className="font-mono text-[10px] text-muted-foreground">{d.day.slice(8)}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Bar = login events that day. Hover for unique users.</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel overflow-hidden">
          <h2 className="border-b p-4 text-lg font-semibold">Mission statistics</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr><th className="p-3">Skill</th><th className="p-3">Completions</th><th className="p-3">Users</th><th className="p-3">Avg score</th></tr></thead>
            <tbody className="divide-y">
              {a.missions.length === 0 && <tr><td colSpan={4} className="p-3 text-muted-foreground">No missions completed yet.</td></tr>}
              {a.missions.map((m) => (
                <tr key={m.skill}><td className="p-3">{SKILL_LABEL[m.skill] ?? m.skill}</td><td className="p-3 font-mono">{m.completions}</td><td className="p-3 font-mono">{m.users}</td><td className="p-3 font-mono">{m.avg_pct}%</td></tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="panel overflow-hidden">
          <h2 className="border-b p-4 text-lg font-semibold">Recent signups</h2>
          <ul className="divide-y text-sm">
            {a.recent_signups.length === 0 && <li className="p-3 text-muted-foreground">No signups yet.</li>}
            {a.recent_signups.map((s) => (
              <li key={s.created_at + (s.email ?? "")} className="flex justify-between gap-3 p-3">
                <span className="min-w-0 truncate">{s.full_name || "—"} <span className="text-muted-foreground">{s.email}</span></span>
                <span className="shrink-0 text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

/* ---------------- Users ---------------- */

type UserSort = "created_at" | "full_name" | "last_sign_in_at" | "login_count";

function Users({ onSelect }: { onSelect: (u: AdminUser) => void }) {
  const q = useQuery({ queryKey: ["admin-users"], queryFn: () => rpc<AdminUser[]>("admin_users") });
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<UserSort>("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = (q.data ?? []).filter((u) =>
      !term || u.full_name.toLowerCase().includes(term) || (u.email ?? "").toLowerCase().includes(term),
    );
    const sorted = [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sortAsc ? cmp : -cmp;
    });
    return sorted;
  }, [q.data, search, sortKey, sortAsc]);

  if (q.isLoading) return <p className="text-muted-foreground">Loading users…</p>;
  if (q.error) return <p className="text-destructive">Couldn't load users. You may not have admin access.</p>;

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const header = (label: string, key: UserSort) => (
    <button
      className="font-medium hover:text-foreground"
      onClick={() => { if (sortKey === key) setSortAsc(!sortAsc); else { setSortKey(key); setSortAsc(true); } setPage(0); }}
    >
      {label} {sortKey === key ? (sortAsc ? "▲" : "▼") : ""}
    </button>
  );

  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <h2 className="text-lg font-semibold">Registered users <span className="text-sm font-normal text-muted-foreground">· {rows.length}</span></h2>
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search name or email…"
          className="w-64 rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-3">{header("Name", "full_name")}</th>
              <th className="p-3">Email</th>
              <th className="p-3">Verified</th>
              <th className="p-3">{header("Registered", "created_at")}</th>
              <th className="p-3">{header("Last login", "last_sign_in_at")}</th>
              <th className="p-3">{header("Logins", "login_count")}</th>
              <th className="p-3">Missions</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {pageRows.length === 0 && <tr><td colSpan={8} className="p-3 text-muted-foreground">No users match.</td></tr>}
            {pageRows.map((u) => (
              <tr key={u.id} className="hover:bg-accent/40">
                <td className="p-3">{u.full_name || "—"}</td>
                <td className="p-3 text-muted-foreground">{u.email}</td>
                <td className="p-3">{u.email_verified ? <span className="text-success">✓ verified</span> : <span className="text-muted-foreground">pending</span>}</td>
                <td className="p-3 font-mono text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="p-3 font-mono text-xs">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : "never"}</td>
                <td className="p-3 font-mono">{u.login_count}</td>
                <td className="p-3 font-mono">{u.mission_count}</td>
                <td className="p-3"><button onClick={() => onSelect(u)} className="text-primary hover:underline">Progress →</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={page} pages={pages} onPage={setPage} />
    </section>
  );
}

/* ---------------- User detail ---------------- */

function UserDetail({ user, onBack }: { user: AdminUser; onBack: () => void }) {
  const q = useQuery({ queryKey: ["admin-user-progress", user.id], queryFn: () => rpc<UserProgress>("admin_user_progress", { _user_id: user.id }) });

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-sm text-primary hover:underline">← Back to users</button>
      <div>
        <h2 className="text-2xl font-bold">{user.full_name || "Unnamed user"}</h2>
        <p className="text-sm text-muted-foreground">{user.email} · registered {new Date(user.created_at).toLocaleDateString()} · {user.email_verified ? "email verified" : "email not verified"}</p>
      </div>

      {q.isLoading && <p className="text-muted-foreground">Loading progress…</p>}
      {q.error && <p className="text-destructive">Couldn't load this user's progress.</p>}
      {q.data && (
        <>
          <section className="panel overflow-hidden">
            <h3 className="border-b p-4 font-semibold">Assessments <span className="text-sm font-normal text-muted-foreground">· pre/post tests</span></h3>
            <ul className="divide-y text-sm">
              {q.data.assessments.length === 0 && <li className="p-3 text-muted-foreground">No assessments taken.</li>}
              {q.data.assessments.map((a) => (
                <li key={a.created_at} className="p-3">
                  <div className="flex justify-between gap-3">
                    <span className="font-medium capitalize">{a.kind}-test</span>
                    <span className="font-mono">{a.score}/{a.total} ({Math.round((a.score / Math.max(1, a.total)) * 100)}%)</span>
                    <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {Object.entries(a.by_skill).map(([s, v]) => `${SKILL_LABEL[s as Skill] ?? s}: ${v.correct}/${v.total}`).join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel overflow-hidden">
            <h3 className="border-b p-4 font-semibold">Completed missions <span className="text-sm font-normal text-muted-foreground">· {q.data.missions.length}</span></h3>
            <ul className="divide-y text-sm">
              {q.data.missions.length === 0 && <li className="p-3 text-muted-foreground">No missions completed.</li>}
              {q.data.missions.map((m) => (
                <li key={m.created_at + m.mission_key} className="flex justify-between gap-3 p-3">
                  <span className="min-w-0 truncate">{m.title} <span className="text-muted-foreground">· {SKILL_LABEL[m.skill] ?? m.skill}</span></span>
                  <span className="shrink-0 font-mono">{m.score}/{m.max_score}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel overflow-hidden">
            <h3 className="border-b p-4 font-semibold">Quiz answers <span className="text-sm font-normal text-muted-foreground">· {q.data.attempts.length}</span></h3>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card text-left text-xs text-muted-foreground"><tr><th className="p-3">Item</th><th className="p-3">Skill</th><th className="p-3">Result</th><th className="p-3">Points</th><th className="p-3">When</th></tr></thead>
                <tbody className="divide-y">
                  {q.data.attempts.length === 0 && <tr><td colSpan={5} className="p-3 text-muted-foreground">No answers recorded.</td></tr>}
                  {q.data.attempts.map((a, i) => (
                    <tr key={a.created_at + i}>
                      <td className="p-3 font-mono text-xs">{a.item_id}</td>
                      <td className="p-3">{SKILL_LABEL[a.skill] ?? a.skill}</td>
                      <td className="p-3">{a.correct ? <span className="text-success">correct</span> : <span className="text-destructive">wrong</span>}</td>
                      <td className="p-3 font-mono">{a.points}/{a.max_points}</td>
                      <td className="p-3 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

/* ---------------- Logins ---------------- */

function Logins() {
  const [page, setPage] = useState(0);
  const q = useQuery({
    queryKey: ["admin-logins", page],
    queryFn: () => rpc<{ total: number; rows: LoginRow[] }>("admin_logins", { _limit: PAGE_SIZE, _offset: page * PAGE_SIZE }),
  });

  if (q.isLoading) return <p className="text-muted-foreground">Loading login history…</p>;
  if (q.error || !q.data) return <p className="text-destructive">Couldn't load login history. You may not have admin access.</p>;

  const pages = Math.max(1, Math.ceil(q.data.total / PAGE_SIZE));

  return (
    <section className="panel overflow-hidden">
      <h2 className="border-b p-4 text-lg font-semibold">Login history <span className="text-sm font-normal text-muted-foreground">· {q.data.total} events</span></h2>
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground"><tr><th className="p-3">User</th><th className="p-3">Email</th><th className="p-3">Timestamp</th></tr></thead>
        <tbody className="divide-y">
          {q.data.rows.length === 0 && <tr><td colSpan={3} className="p-3 text-muted-foreground">No logins recorded yet.</td></tr>}
          {q.data.rows.map((r) => (
            <tr key={r.id}>
              <td className="p-3">{r.full_name || "—"}</td>
              <td className="p-3 text-muted-foreground">{r.email}</td>
              <td className="p-3 font-mono text-xs">{new Date(r.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pager page={page} pages={pages} onPage={setPage} />
    </section>
  );
}

/* ---------------- Shared bits ---------------- */

function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t p-3 text-sm">
      <button disabled={page === 0} onClick={() => onPage(page - 1)} className="rounded-md border px-3 py-1 disabled:opacity-40">← Previous</button>
      <span className="text-xs text-muted-foreground">Page {page + 1} of {pages}</span>
      <button disabled={page >= pages - 1} onClick={() => onPage(page + 1)} className="rounded-md border px-3 py-1 disabled:opacity-40">Next →</button>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="panel p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}
