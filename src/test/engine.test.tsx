import { describe, expect, it } from "vitest";
import { scoreChoice, scoreDecision, scorePhishing } from "@/lib/engine";

describe("scoring rules", () => {
  it("phishing exact verdict earns 10", () => expect(scorePhishing("phishing", "phishing").points).toBe(10));
  it("phishing vs suspicious earns 5 partial", () => expect(scorePhishing("suspicious", "phishing").points).toBe(5));
  it("calling phishing legitimate earns 0", () => expect(scorePhishing("legitimate", "phishing").points).toBe(0));
  it("incident decisions score 10/5/0", () => {
    expect([scoreDecision("best").points, scoreDecision("ok").points, scoreDecision("poor").points]).toEqual([10, 5, 0]);
  });
  it("code choice wrong earns 0", () => expect(scoreChoice("none", "sqli").points).toBe(0));
});
