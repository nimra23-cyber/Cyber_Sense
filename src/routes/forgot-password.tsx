import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard, Field, FormAlert, SubmitButton } from "@/components/auth-ui";
import { emailSchema } from "@/lib/auth-validation";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password — CyberSense" },
      { name: "description", content: "Request a password reset link for your CyberSense account." },
      { property: "og:title", content: "Reset password — CyberSense" },
      { property: "og:description", content: "Get a link to reset your password." },
    ],
  }),
  component: Forgot,
});

function Forgot() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const p = emailSchema.safeParse(email);
    if (!p.success) return setError(p.error.issues[0]?.message);
    setError(undefined);
    setBusy(true);
    await supabase.auth.resetPasswordForEmail(p.data, { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    setSent(true); // Same message either way, so emails can't be probed.
  };

  return (
    <AuthCard title="Forgot your password?" subtitle="We'll email you a secure reset link."
      footer={<Link to="/auth" className="text-primary hover:underline">Back to sign in</Link>}>
      {sent ? (
        <FormAlert tone="success">If an account exists for {email}, a reset link is on its way.</FormAlert>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field id="email" label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} error={error} />
          <SubmitButton loading={busy}>Send reset link</SubmitButton>
        </form>
      )}
    </AuthCard>
  );
}
