import { describe, expect, it } from "vitest";
import { safeRedirect, signUpSchema } from "@/lib/auth-validation";

const base = { fullName: "Ada Lovelace", email: "ada@example.com", password: "defender42", confirm: "defender42" };

describe("sign-up rules", () => {
  it("accepts a valid sign-up", () => expect(signUpSchema.safeParse(base).success).toBe(true));
  it("rejects passwords shorter than 8 characters", () => expect(signUpSchema.safeParse({ ...base, password: "abc12", confirm: "abc12" }).success).toBe(false));
  it("rejects passwords without a number", () => expect(signUpSchema.safeParse({ ...base, password: "onlyletters", confirm: "onlyletters" }).success).toBe(false));
  it("rejects mismatched confirmation", () => expect(signUpSchema.safeParse({ ...base, confirm: "different42" }).success).toBe(false));
});

describe("post-login redirect", () => {
  it("keeps same-site paths", () => expect(safeRedirect("/missions/code")).toBe("/missions/code"));
  it("blocks external sites", () => expect(safeRedirect("https://evil.example/x")).toBe("/dashboard"));
  it("blocks protocol-relative urls", () => expect(safeRedirect("//evil.example")).toBe("/dashboard"));
});
