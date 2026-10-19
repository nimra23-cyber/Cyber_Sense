import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { syncProgressUser } from "@/lib/progress-store";

interface AuthState {
  session: Session | null;
  loading: boolean;
  fullName: string;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthState>({ session: null, loading: true, fullName: "", isAdmin: false });

export function AuthProvider({ children, onIdentityChange }: { children: ReactNode; onIdentityChange: (event: string) => void }) {
  const [state, setState] = useState<AuthState>({ session: null, loading: true, fullName: "", isAdmin: false });

  useEffect(() => {
    let active = true;
    const loadExtras = async (session: Session | null) => {
      void syncProgressUser(session?.user.id ?? null);
      if (!session) {
        if (active) setState({ session: null, loading: false, fullName: "", isAdmin: false });
        return;
      }
      const meta = (session.user.user_metadata?.["full_name"] as string | undefined) ?? "";
      if (active) setState((s) => ({ ...s, session, loading: false, fullName: s.fullName || meta }));
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", session.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", session.user.id),
      ]);
      if (active) {
        setState({
          session,
          loading: false,
          fullName: profile?.full_name || meta || session.user.email || "",
          isAdmin: !!roles?.some((r) => r.role === "admin"),
        });
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        // Defer Supabase calls out of the auth callback to avoid deadlocks.
        setTimeout(() => void loadExtras(session), 0);
      }
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") onIdentityChange(event);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

/** Record a successful login event (user id + time only, enforced server-side). */
export async function recordLogin() {
  await supabase.rpc("record_login");
}
