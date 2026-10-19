import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard, Field, FormAlert, SubmitButton } from "@/components/auth-ui";
import { fieldErrors, loginSchema, safeRedirect, signUpSchema } from "@/lib/auth-validation";
import { recordLogin, useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ mode: z.enum(["login", "signup"]).optional(), redirect: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Sign in — CyberSense" },
      { name: "description", content: "Sign in or create your CyberSense account to save your training progress." },
      { property: "og:title", content: "Sign in — CyberSense" },
      { property: "og:description", content: "Create an account to track your defender training." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode = "login", redirect } = Route.useSearch();
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const target = safeRedirect(redirect);

  useEffect(() => {
    if (!loading && session) void navigate({ to: target, replace: true });
  }, [loading, session, navigate, target]);

  return mode === "signup" ? <SignUp redirect={redirect} /> : <Login redirect={redirect} target={target} />;
}

function Login({ redirect, target }: { redirect: string | undefined; target: string }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const parsed = loginSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) {
      setBusy(false);
      setMsg(/confirm/i.test(error.message) ? "Please confirm your email first — check your inbox for the link." : /invalid/i.test(error.message) ? "Incorrect email or password." : error.message);
      return;
    }
    await recordLogin().catch(() => undefined);
    void navigate({ to: target, replace: true });
  };

  return (
    <AuthCard title="Welcome back, defender" subtitle="Sign in to continue your training."
      footer={<>New here? <Link to="/auth" search={{ mode: "signup", redirect }} className="text-primary hover:underline">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {msg && <FormAlert tone="error">{msg}</FormAlert>}
        <Field id="email" label="Email" type="email" autoComplete="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} error={errors["email"]} />
        <Field id="password" label="Password" type="password" autoComplete="current-password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} error={errors["password"]} />
        <div className="text-right"><Link to="/forgot-password" className="text-sm text-primary hover:underline">Forgot password?</Link></div>
        <SubmitButton loading={busy}>Sign in</SubmitButton>
      </form>
    </AuthCard>
  );
}

function SignUp({ redirect }: { redirect: string | undefined }) {
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const parsed = signUpSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: { full_name: parsed.data.fullName } },
    });
    setBusy(false);
    if (error) return setMsg(/registered|exists/i.test(error.message) ? "An account with this email already exists. Try signing in." : error.message);
    setDone(true);
  };

  if (done) {
    return (
      <AuthCard title="Check your email" subtitle="One more step to activate your account.">
        <FormAlert tone="success">We sent a confirmation link to <strong>{form.email}</strong>. Open it to activate your account, then sign in.</FormAlert>
        <Link to="/auth" search={{ mode: "login", redirect }} className="mt-4 block text-center text-sm text-primary hover:underline">Back to sign in</Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Create your account" subtitle="Save your scores and track your progress."
      footer={<>Already have an account? <Link to="/auth" search={{ mode: "login", redirect }} className="text-primary hover:underline">Sign in</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {msg && <FormAlert tone="error">{msg}</FormAlert>}
        <Field id="fullName" label="Full name" autoComplete="name" value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} error={errors["fullName"]} />
        <Field id="email" label="Email" type="email" autoComplete="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} error={errors["email"]} />
        <Field id="password" label="Password" type="password" autoComplete="new-password" placeholder="8+ characters, letters and numbers" value={form.password} onChange={(v) => setForm({ ...form, password: v })} error={errors["password"]} />
        <Field id="confirm" label="Confirm password" type="password" autoComplete="new-password" value={form.confirm} onChange={(v) => setForm({ ...form, confirm: v })} error={errors["confirm"]} />
        <SubmitButton loading={busy}>Create account</SubmitButton>
      </form>
    </AuthCard>
  );
}
