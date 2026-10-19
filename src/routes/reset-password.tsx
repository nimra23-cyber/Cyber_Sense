import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard, Field, FormAlert, SubmitButton } from "@/components/auth-ui";
import { passwordSchema } from "@/lib/auth-validation";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password — CyberSense" },
      { name: "description", content: "Set a new password for your CyberSense account." },
      { property: "og:title", content: "Choose a new password — CyberSense" },
      { property: "og:description", content: "Set a new password." },
    ],
  }),
  component: Reset,
});

function Reset() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ pw?: string; confirm?: string }>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const isRecovery = window.location.hash.includes("type=recovery");
    const { data } = supabase.auth.onAuthStateChange((event) => { if (event === "PASSWORD_RECOVERY") setReady(true); });
    void supabase.auth.getSession().then(({ data: s }) => { if (s.session && isRecovery) setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const p = passwordSchema.safeParse(pw);
    const next: typeof errors = {};
    if (!p.success) next.pw = p.error.issues[0]?.message ?? "Invalid password";
    if (pw !== confirm) next.confirm = "Passwords do not match";
    setErrors(next);
    if (next.pw || next.confirm) return;
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setMsg(error.message);
    void navigate({ to: "/dashboard", replace: true });
  };

  return (
    <AuthCard title="Choose a new password" subtitle="Pick something long and unique.">
      {!ready ? (
        <div className="space-y-3">
          <FormAlert tone="error">Open this page from the reset link in your email. Links expire after a short time.</FormAlert>
          <Link to="/forgot-password" className="block text-center text-sm text-primary hover:underline">Request a new link</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          {msg && <FormAlert tone="error">{msg}</FormAlert>}
          <Field id="pw" label="New password" type="password" autoComplete="new-password" value={pw} onChange={setPw} error={errors.pw} />
          <Field id="confirm" label="Confirm new password" type="password" autoComplete="new-password" value={confirm} onChange={setConfirm} error={errors.confirm} />
          <SubmitButton loading={busy}>Update password</SubmitButton>
        </form>
      )}
    </AuthCard>
  );
}
