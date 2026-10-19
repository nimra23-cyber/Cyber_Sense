import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useNavigate,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider, recordLogin, useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "CyberSense — Think Like a Defender" },
      { name: "description", content: "Hands-on cybersecurity training: phishing, incident response and secure code missions." },
      { property: "og:title", content: "CyberSense — Think Like a Defender" },
      { property: "og:description", content: "Hands-on cybersecurity training missions for beginners." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Manrope:wght@400;500;600;700&family=Sora:wght@600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const NAV = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/missions/phishing", label: "Phishing" },
  { to: "/missions/incident", label: "Incidents" },
  { to: "/missions/code", label: "Code" },
  { to: "/assessment", label: "Assessment" },
] as const;

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider
        onIdentityChange={(event) => {
          if (event === "SIGNED_IN" && /type=(signup|magiclink|email)/.test(window.location.hash)) void recordLogin().catch(() => undefined);
          void router.invalidate();
          if (event !== "SIGNED_OUT") void queryClient.invalidateQueries();
        }}
      >
        <div className="relative min-h-screen bg-glow">
          <div className="pointer-events-none absolute inset-0 bg-grid" />
          <Header />
          <main className="relative mx-auto max-w-6xl px-4 py-8">
            <Outlet />
          </main>
          <footer className="relative mx-auto max-w-6xl px-4 pb-8 text-xs text-muted-foreground">
            All organisations, people and code samples are fictional.
          </footer>
        </div>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function Header() {
  const { session, fullName, isAdmin } = useAuth();
  const { queryClient } = Route.useRouteContext();
  const navigate = useNavigate();
  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  };
  const initials = (fullName || "?").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
        <Link to={session ? "/dashboard" : "/"} className="flex items-center gap-2 font-display text-lg font-bold">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-brand text-primary-foreground">◆</span>
          <span>Cyber<span className="text-gradient">Sense</span></span>
        </Link>
        {session ? (
          <div className="flex min-w-0 items-center gap-2">
            <nav className="flex gap-1 overflow-x-auto text-sm">
              {NAV.map((n) => (
                <Link key={n.to} to={n.to} activeOptions={{ exact: true }}
                  className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  activeProps={{ className: "bg-accent text-foreground" }}>
                  {n.label}
                </Link>
              ))}
            </nav>
            <DropdownMenu>
              <DropdownMenuTrigger aria-label="Account menu" className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-brand text-xs font-bold text-primary-foreground">
                {initials}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="truncate">{fullName}</p>
                  <p className="truncate text-xs font-normal text-muted-foreground">{session.user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void navigate({ to: "/dashboard" })}>Dashboard</DropdownMenuItem>
                {isAdmin && <DropdownMenuItem onSelect={() => void navigate({ to: "/admin" })}>Admin analytics</DropdownMenuItem>}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void signOut()}>Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="flex gap-2 text-sm">
            <Link to="/auth" className="rounded-md px-3 py-1.5 hover:bg-accent">Sign in</Link>
            <Link to="/auth" search={{ mode: "signup" }} className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground">Sign up</Link>
          </div>
        )}
      </div>
    </header>
  );
}
