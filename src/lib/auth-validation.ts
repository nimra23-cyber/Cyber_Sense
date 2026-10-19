import { z } from "zod";

export const emailSchema = z.string().trim().min(1, "Email is required").email("Enter a valid email address").max(255);
export const passwordSchema = z.string().min(8, "Use at least 8 characters").max(72, "Use 72 characters or fewer")
  .regex(/[A-Za-z]/, "Include at least one letter").regex(/[0-9]/, "Include at least one number");

export const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(100, "Name is too long"),
  email: emailSchema,
  password: passwordSchema,
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords do not match" });

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, "Password is required") });

export function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of err.issues) { const k = String(i.path[0]); if (!out[k]) out[k] = i.message; }
  return out;
}

/** Only allow same-origin relative paths as post-login redirects. */
export function safeRedirect(r: unknown): string {
  if (typeof r !== "string") return "/dashboard";
  try {
    const u = new URL(r, "http://x");
    if (u.origin !== "http://x" && !(typeof window !== "undefined" && u.origin === window.location.origin)) return "/dashboard";
    const path = u.pathname + u.search;
    return path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/auth") ? path : "/dashboard";
  } catch { return "/dashboard"; }
}
