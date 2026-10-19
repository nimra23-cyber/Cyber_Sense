/**
 * Learning assistant provider interface.
 * The MVP ships a rule-based provider only. To add a real LLM later, implement
 * AssistantProvider with a TanStack `createServerFn` that calls the model server-side
 * (keys read from process.env inside the handler) — never call a model from the browser.
 */
export interface AssistantReply { text: string; topic?: string; followUps?: string[] }
export interface AssistantProvider { id: string; label: string; isLLM: boolean; reply(message: string): Promise<AssistantReply> }

interface Topic { id: string; title: string; keywords: string[]; answer: string; followUps: string[] }

export const TOPICS: Topic[] = [
  { id: "phishing", title: "Phishing", keywords: ["phish", "scam email", "fake email", "suspicious email"], answer: "**Phishing** is a message that tricks you into giving away secrets or clicking something harmful.\n\n**Example:** an email from \"northbank-verify.co\" says your account is locked and asks for your PIN.\n\n**Defend:** check the sender's real domain, distrust urgency, and go to the site yourself instead of clicking links.", followUps: ["How do I read a domain?", "What is spear phishing?"] },
  { id: "domain", title: "Reading domains", keywords: ["domain", "url", "link", "hover"], answer: "Read a web address **right-to-left**. In `login.mybank.com.secure-check.net`, the real domain is **secure-check.net** — everything before it is just a prefix the attacker controls.\n\n**Defend:** hover over links to preview them, and watch for lookalikes like `rnicrosoft` (r+n) or `paypa1` (digit 1).", followUps: ["What is phishing?", "What is HTTPS?"] },
  { id: "spear", title: "Spear phishing & BEC", keywords: ["spear", "ceo", "bec", "impersonat", "gift card"], answer: "**Spear phishing** targets a specific person using real details (names, projects). **Business email compromise** often impersonates a boss asking for payments or gift cards.\n\n**Defend:** verify unusual requests through a second channel you already trust, like a known phone number.", followUps: ["What is social engineering?"] },
  { id: "social", title: "Social engineering", keywords: ["social engineering", "manipulat", "pretext"], answer: "**Social engineering** manipulates people rather than computers — using urgency, authority, fear or curiosity.\n\n**Example:** a caller claiming to be IT asks for your MFA code.\n\n**Defend:** slow down. Legitimate teams never need your password or MFA codes.", followUps: ["What is MFA?"] },
  { id: "mfa", title: "Multi-factor authentication", keywords: ["mfa", "2fa", "two factor", "multi-factor", "authenticator"], answer: "**MFA** requires a second proof (an app code, a security key) in addition to your password, so a stolen password alone isn't enough.\n\n**Defend:** turn it on for email and banking first. Prefer authenticator apps or security keys over SMS, and never share codes.", followUps: ["How do I make a strong password?"] },
  { id: "password", title: "Passwords", keywords: ["password", "passphrase", "password manager", "credential"], answer: "Use a **long, unique passphrase** for each account — e.g. `copper-violin-rainy-tulip`. Reuse is the real danger: one breach unlocks everything.\n\n**Defend:** use a password manager and enable MFA.", followUps: ["What is password spraying?", "What is MFA?"] },
  { id: "spray", title: "Brute force & spraying", keywords: ["brute", "spray", "failed login", "lockout"], answer: "**Brute force** tries many passwords on one account; **password spraying** tries a few common passwords on many accounts to avoid lockouts.\n\n**Defend (as a defender):** review auth logs for many accounts failing from the same IPs, block sources, enforce MFA, and reset any account that succeeded.", followUps: ["What does incident response involve?"] },
  { id: "ir", title: "Incident response", keywords: ["incident", "respond", "breach", "compromis", "contain"], answer: "Incident response is usually: **Prepare → Detect & analyse → Contain → Eradicate & recover → Lessons learned.**\n\n**Example:** for a compromised mailbox — verify via sign-in logs, revoke sessions, reset password + MFA, remove forwarding rules, preserve logs, then escalate.\n\nKey habit: contain before you clean up, and never destroy evidence.", followUps: ["Why preserve evidence?"] },
  { id: "evidence", title: "Preserving evidence", keywords: ["evidence", "logs", "forensic"], answer: "Logs and artifacts show **what happened, when, and how far it spread**. Deleting them can hide the true scope and break reporting obligations.\n\n**Defend:** export relevant logs, note timestamps, and record each action you take.", followUps: ["What does incident response involve?"] },
  { id: "malware", title: "Malware & attachments", keywords: ["malware", "virus", "ransomware", "attachment", "zip", "macro"], answer: "**Malware** is harmful software, often delivered by attachments like `.zip`, `.iso` or macro-enabled documents.\n\n**Defend:** don't open unexpected attachments, report them to IT, and keep devices updated. Analysts test samples only in isolated, approved sandboxes.", followUps: ["What is ransomware?"] },
  { id: "ransom", title: "Ransomware", keywords: ["ransomware", "encrypt my files"], answer: "**Ransomware** encrypts files and demands payment.\n\n**Defend:** keep offline/immutable backups, patch systems, use MFA, and practise restoring backups — a backup you've never restored is a hope, not a plan.", followUps: ["What is malware?"] },
  { id: "sqli", title: "SQL injection", keywords: ["sql", "injection", "sqli", "query"], answer: "**SQL injection (CWE-89)** happens when user input is pasted into a query string, so input can change the query itself.\n\n**Unsafe:** `\"... WHERE name='\" + name + \"'\"`\n**Safe:** `cur.execute(\"... WHERE name = ?\", (name,))`\n\nAlways use parameterised queries.", followUps: ["What is command injection?"] },
  { id: "cmdi", title: "Command injection", keywords: ["command injection", "os.system", "popen", "shell", "subprocess"], answer: "**Command injection (CWE-78)**: passing user input into a shell lets characters like `;` chain extra commands.\n\n**Defend:** validate against an allow-list and call `subprocess.run([\"ping\", \"-c\", \"1\", host])` with a list — no shell.", followUps: ["What is input validation?"] },
  { id: "validation", title: "Input validation", keywords: ["validat", "untrusted", "sanitiz", "xss", "input"], answer: "Treat **all external input as untrusted** — forms, URLs, files, headers.\n\n**Defend:** validate type, length and format with an allow-list; encode output for its context (HTML, SQL, shell); and use safe library APIs rather than building strings by hand.", followUps: ["What is SQL injection?"] },
  { id: "secrets", title: "Hardcoded secrets", keywords: ["hardcod", "api key", "secret", "env", "token"], answer: "**Hardcoded credentials (CWE-798)** are passwords or keys written in source code. They leak via repos and screenshots.\n\n**Defend:** load them from environment variables or a secrets manager, enable secret scanning, and rotate anything that was ever committed.", followUps: ["What is input validation?"] },
  { id: "https", title: "HTTPS", keywords: ["https", "padlock", "tls", "ssl", "certificate"], answer: "**HTTPS** encrypts the connection between you and a site. But the padlock **doesn't mean the site is trustworthy** — phishing sites use HTTPS too.\n\n**Defend:** always check the domain itself, not just the padlock.", followUps: ["How do I read a domain?"] },
];

const GREETING = /^(hi|hello|hey|salam|yo)\b/i;

export function matchTopic(message: string): Topic | null {
  const m = message.toLowerCase();
  let best: { t: Topic; score: number } | null = null;
  for (const t of TOPICS) {
    const score = t.keywords.reduce((s, k) => (m.includes(k) ? s + k.length : s), 0);
    if (score > 0 && (!best || score > best.score)) best = { t, score };
  }
  return best?.t ?? null;
}

export const ruleBasedProvider: AssistantProvider = {
  id: "rule-based", label: "Rule-based demo assistant", isLLM: false,
  async reply(message) {
    if (GREETING.test(message.trim())) return { text: "Hi! I'm the CyberSense demo assistant. I explain beginner cybersecurity topics with short examples. Pick a topic below or ask about phishing, passwords, MFA, incident response or secure coding.", followUps: ["What is phishing?", "What is SQL injection?", "What is MFA?"] };
    const t = matchTopic(message);
    if (!t) return { text: "I'm a rule-based demo, so I only know a fixed set of beginner topics. I couldn't match that question. Try one of these:", followUps: TOPICS.slice(0, 6).map((x) => `Tell me about ${x.title.toLowerCase()}`) };
    return { text: t.answer, topic: t.title, followUps: t.followUps };
  },
};
