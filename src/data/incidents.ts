export type Quality = "best" | "ok" | "poor";

export interface IROption {
  label: string;
  quality: Quality;
  consequence: string;
  next?: string; // step id; undefined = end scenario
}
export interface IRStep { id: string; prompt: string; detail?: string; options: IROption[] }
export interface IRScenario { id: string; title: string; summary: string; role: string; start: string; steps: Record<string, IRStep> }

// Fictional organisations and logs. All actions are defensive.
export const INCIDENTS: IRScenario[] = [
  {
    id: "ir-login", title: "Repeated Failed Logins", role: "Junior SOC analyst",
    summary: "Your monitoring dashboard shows 214 failed login attempts against the staff portal in 10 minutes.",
    start: "a",
    steps: {
      a: {
        id: "a", prompt: "An alert fires: 214 failed logins in 10 minutes. What do you do first?",
        detail: "Alert: AUTH-FAIL-THRESHOLD · staff-portal · 09:42–09:52",
        options: [
          { label: "Review authentication logs to see which accounts and source IPs are involved", quality: "best", consequence: "You find 3 source IPs targeting 40 different accounts with common passwords — a password-spraying pattern. You now know the scope.", next: "b" },
          { label: "Immediately disable the staff portal for everyone", quality: "poor", consequence: "Hundreds of staff are locked out and the help desk is flooded. You still don't know what's happening — and disabling the service destroyed no attacker, only productivity.", next: "b" },
          { label: "Assume it's a user who forgot their password and close the alert", quality: "poor", consequence: "Closing alerts without evidence is risky. Two hours later, the same pattern returns at a larger scale.", next: "b" },
        ],
      },
      b: {
        id: "b", prompt: "Logs show password spraying from 3 IPs. One account, j.ortiz, had a successful login after 30 failures. Next step?",
        options: [
          { label: "Block the 3 source IPs and lock/reset j.ortiz, requiring MFA re-enrolment", quality: "best", consequence: "The attack is contained, and the possibly-compromised account can no longer be used by the attacker.", next: "c" },
          { label: "Email j.ortiz asking if they logged in", quality: "ok", consequence: "Verification is useful, but if the account is compromised the attacker may read that email. Contain first, then verify through a separate channel.", next: "c" },
          { label: "Delete the authentication logs to free up storage", quality: "poor", consequence: "Deleting logs destroys evidence you'll need for the investigation and any reporting obligations.", next: "c" },
        ],
      },
      c: {
        id: "c", prompt: "The attack is contained. How do you wrap up?",
        options: [
          { label: "Preserve logs, document a timeline, escalate to the incident lead, and recommend MFA for all staff", quality: "best", consequence: "Excellent. Evidence is preserved, leadership is informed, and you've proposed a fix for the root cause." },
          { label: "Write a short note in the ticket and move on", quality: "ok", consequence: "Some record exists, but no one with authority knows about a successful compromise, and the root cause remains." },
          { label: "Post the attacker IPs and affected usernames on a public forum for help", quality: "poor", consequence: "Sharing affected usernames publicly exposes colleagues and leaks internal details. Use internal escalation channels." },
        ],
      },
    },
  },
  {
    id: "ir-account", title: "Suspected Compromised Account", role: "IT support lead",
    summary: "A colleague, Sam, says their email is sending messages they never wrote.",
    start: "a",
    steps: {
      a: {
        id: "a", prompt: "Sam reports odd sent messages. What's your first move?",
        options: [
          { label: "Verify the report: check Sam's sent items, sign-in history and mailbox rules", quality: "best", consequence: "You find sign-ins from an unfamiliar country and a hidden rule forwarding all mail externally. The compromise is confirmed.", next: "b" },
          { label: "Tell Sam to just change their password later today", quality: "ok", consequence: "A password change helps, but delaying gives the attacker hours more access, and a forwarding rule would survive the reset.", next: "b" },
          { label: "Ignore it — Sam probably sent them and forgot", quality: "poor", consequence: "More colleagues receive malicious messages from Sam's trusted address.", next: "b2" },
        ],
      },
      b2: {
        id: "b2", prompt: "Three colleagues now report suspicious emails from Sam containing a payment link. Recover the situation:",
        options: [
          { label: "Treat it as an incident now: investigate Sam's account and warn recipients", quality: "best", consequence: "Late, but correct. You confirm the compromise and stop further spread.", next: "b" },
          { label: "Ask the colleagues to delete the emails and do nothing else", quality: "poor", consequence: "The source of the problem — the compromised account — is still active.", next: "b" },
          { label: "Reply-all asking if anyone clicked", quality: "ok", consequence: "Some useful information, but the account is still under attacker control.", next: "b" },
        ],
      },
      b: {
        id: "b", prompt: "Compromise confirmed. How do you contain it?",
        options: [
          { label: "Revoke active sessions, reset the password, enforce MFA, and remove the forwarding rule", quality: "best", consequence: "The attacker loses access and persistence. Nothing else keeps forwarding mail out.", next: "c" },
          { label: "Reset the password only", quality: "ok", consequence: "Active sessions and the forwarding rule may keep working. Containment is incomplete.", next: "c" },
          { label: "Delete Sam's account entirely", quality: "poor", consequence: "You destroy evidence and Sam's work data. Containment shouldn't destroy what you need to investigate.", next: "c" },
        ],
      },
      c: {
        id: "c", prompt: "Final step:",
        options: [
          { label: "Export sign-in logs and the rule as evidence, notify recipients, and escalate per the incident plan", quality: "best", consequence: "A complete, documented response. Recipients know not to trust the earlier messages." },
          { label: "Consider it fixed and close the ticket", quality: "ok", consequence: "Recipients of the malicious messages remain at risk and there's no record for follow-up." },
          { label: "Publicly blame Sam in a company-wide email", quality: "poor", consequence: "Blame discourages people from reporting. Healthy security culture rewards early reporting." },
        ],
      },
    },
  },
  {
    id: "ir-attachment", title: "Suspicious Attachment Report", role: "Security analyst",
    summary: "Priya in Finance forwards an email with an attachment 'Invoice_Overdue.zip' and asks if it's safe.",
    start: "a",
    steps: {
      a: {
        id: "a", prompt: "Priya asks if the attachment is safe. What do you do?",
        options: [
          { label: "Thank Priya, ask whether she opened it, and tell her not to open it while you check", quality: "best", consequence: "Priya says she did not open it. Encouraging reporting makes it more likely people report next time.", next: "b" },
          { label: "Open the attachment on your own work laptop to see what it does", quality: "poor", consequence: "Never open suspicious files on a normal workstation. That could infect your own device.", next: "b" },
          { label: "Tell her it's probably fine", quality: "poor", consequence: "Guessing isn't an assessment. If it's malicious, she may now open it.", next: "b" },
        ],
      },
      b: {
        id: "b", prompt: "How do you analyse the email safely?",
        options: [
          { label: "Check the headers and sender domain, and submit the file hash to your organisation's approved sandbox", quality: "best", consequence: "The sender domain was registered 2 days ago and the sandbox flags the file as a malicious script. Analysis done safely.", next: "c" },
          { label: "Search the sender name online", quality: "ok", consequence: "This gives some context, but names are easily spoofed. Technical indicators are more reliable.", next: "c" },
          { label: "Forward it to all staff asking if anyone recognises it", quality: "poor", consequence: "You've just distributed a malicious attachment to the whole company.", next: "c" },
        ],
      },
      c: {
        id: "c", prompt: "The file is malicious. Final action?",
        options: [
          { label: "Search for and quarantine the same email in other mailboxes, block the sender domain, and document the case", quality: "best", consequence: "Two other copies are found and removed before anyone opens them. Excellent proactive containment." },
          { label: "Delete Priya's copy only", quality: "ok", consequence: "Priya is safe, but other staff may have received the same email." },
          { label: "Do nothing since Priya didn't open it", quality: "poor", consequence: "Another employee opens a copy the next day." },
        ],
      },
    },
  },
];
