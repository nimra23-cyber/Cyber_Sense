import type { PhishVerdict } from "@/lib/engine";

export interface PhishEmail {
  id: string;
  level: 1 | 2 | 3;
  fromName: string;
  fromAddress: string;
  subject: string;
  received: string;
  body: string[];
  linkText?: string;
  linkTarget?: string;
  attachment?: string;
  context: string;
  answer: PhishVerdict;
  hint: string;
  explanation: string;
  evidence: string[];
  recommendation: string;
}

// All organisations, domains and people below are fictional. Links are displayed as text only.
export const PHISHING_EMAILS: PhishEmail[] = [
  {
    id: "p1", level: 1,
    fromName: "Northbank Security Team", fromAddress: "alerts@northbank-secure-verify.co",
    subject: "URGENT: Your account will be suspended in 2 hours",
    received: "Today, 07:12",
    body: ["Dear Customer,", "We detected unusual activity on your account. To avoid permanent suspension you must confirm your identity within 2 hours.", "Click below and enter your card number, PIN and online banking password."],
    linkText: "Verify My Account Now", linkTarget: "http://northbank-secure-verify.co/login.php",
    context: "You bank with Northbank, whose real domain is northbank.com.",
    answer: "phishing",
    hint: "Compare the sender domain to the bank's real domain, and notice what information is requested.",
    explanation: "This is a classic credential-harvesting phish. It pressures you with a deadline and asks for secrets no bank ever requests by email.",
    evidence: ["Lookalike domain: northbank-secure-verify.co is not northbank.com", "Extreme urgency: 'within 2 hours' and 'permanent suspension'", "Requests PIN and password — legitimate banks never ask for these", "Generic greeting 'Dear Customer'", "Link uses unencrypted http:// on the lookalike domain"],
    recommendation: "Don't click. Open your banking app or type the bank's address yourself, then report the email to your bank's official phishing address.",
  },
  {
    id: "p2", level: 1,
    fromName: "Riverside University IT", fromAddress: "it-service@riverside.edu",
    subject: "Scheduled maintenance: Student portal, Saturday 22:00–02:00",
    received: "Yesterday, 16:40",
    body: ["Hi all,", "The student portal will be unavailable this Saturday from 22:00 to 02:00 for planned upgrades. No action is required from you.", "Status updates will be posted on the IT service page."],
    linkText: "status.riverside.edu", linkTarget: "https://status.riverside.edu",
    context: "You are a student at Riverside University (riverside.edu). The IT department sent similar notices last term.",
    answer: "legitimate",
    hint: "Ask: is anything being requested from me? Does the domain match exactly?",
    explanation: "This is a routine, informational notice. It comes from the real university domain, asks for nothing, and points to an official status page.",
    evidence: ["Sender domain exactly matches riverside.edu", "No request for credentials, payment or downloads", "'No action is required' — no pressure", "Link points to a subdomain of the real domain over HTTPS", "Consistent with previous notices you've received"],
    recommendation: "Legitimate emails still deserve a glance: if unsure, check the status page by typing the address yourself.",
  },
  {
    id: "p3", level: 2,
    fromName: "Maya Chen (CEO)", fromAddress: "maya.chen.ceo@gmail.com",
    subject: "Quick favour — are you at your desk?",
    received: "Today, 11:03",
    body: ["Hi,", "I'm in back-to-back meetings and need you to buy 5 gift cards ($100 each) for a client appreciation event. Keep this between us for now — it's a surprise.", "Send me the codes by reply as soon as you have them. Thanks."],
    context: "You work at Lumen Analytics (lumenanalytics.com). Maya Chen is the real CEO but never emails you directly.",
    answer: "phishing",
    hint: "Would a CEO use a personal email to request gift cards and secrecy?",
    explanation: "This is CEO-impersonation (business email compromise). Attackers abuse authority, secrecy and gift cards because they're untraceable.",
    evidence: ["Executive using a free personal address instead of lumenanalytics.com", "Gift-card purchase request — a hallmark of scams", "Request for secrecy bypasses normal checks", "Urgency and unavailability ('back-to-back meetings') block verification"],
    recommendation: "Verify through a separate channel (company chat or a known phone number). Never send gift-card codes by email. Report to your security team.",
  },
  {
    id: "p4", level: 2,
    fromName: "ParcelGo Delivery", fromAddress: "no-reply@parcelgo-notify.com",
    subject: "Delivery attempt failed — reschedule required",
    received: "Today, 09:27",
    body: ["We attempted to deliver your package but no one was available.", "A small redelivery fee of $1.99 is required. Please reschedule using the link below."],
    linkText: "Reschedule delivery", linkTarget: "https://parcelgo-notify.com/r/8841",
    context: "You ordered something online last week, but the shop said it would ship with a different courier. ParcelGo's real domain is parcelgo.com.",
    answer: "suspicious",
    hint: "Some details fit, some don't. What can you verify independently?",
    explanation: "This can't be confirmed either way from the email alone. The fee request and unfamiliar domain are red flags, but you are expecting a parcel. Treat it as suspicious and verify independently.",
    evidence: ["Domain parcelgo-notify.com differs from the real parcelgo.com", "Small 'redelivery fee' is a common card-harvesting lure", "No tracking number or recipient name", "Courier doesn't match what the shop told you"],
    recommendation: "Don't use the link. Check the tracking number from your original order confirmation on the courier's official site.",
  },
  {
    id: "p5", level: 3,
    fromName: "Docs Share", fromAddress: "share-noreply@docs.lumenanalytics.com.share-files.net",
    subject: "Q3 Salary Adjustments.xlsx has been shared with you",
    received: "Today, 14:55",
    body: ["HR Department has shared a file with you.", "Q3 Salary Adjustments.xlsx", "Sign in with your company account to view."],
    linkText: "Open in Docs", linkTarget: "https://docs.lumenanalytics.com.share-files.net/auth",
    context: "Your company domain is lumenanalytics.com. HR normally shares files via the internal portal, not email notifications.",
    answer: "phishing",
    hint: "Read domains from right to left — the real domain is the part right before the final dot-suffix.",
    explanation: "The domain starts with your company name, but the actual registered domain is share-files.net. Salary curiosity is used as bait for a fake login page.",
    evidence: ["Real domain is share-files.net — 'lumenanalytics.com' is just a subdomain prefix", "Emotional bait: salary information", "Prompts a company sign-in on an external site", "Vague sender 'HR Department' with no named person"],
    recommendation: "Hover (don't click) to inspect links and read the domain right-to-left. Report to IT; if you entered credentials, change your password immediately.",
  },
  {
    id: "p6", level: 3,
    fromName: "CodeHub", fromAddress: "noreply@codehub.com",
    subject: "[CodeHub] A new sign-in to your account",
    received: "Today, 10:15",
    body: ["Hi student-dev,", "We noticed a new sign-in to your account from Chrome on Windows in Lahore, PK, at 10:14.", "If this was you, you can ignore this message. If not, review your security settings from your account page."],
    linkText: "codehub.com/settings/security", linkTarget: "https://codehub.com/settings/security",
    context: "You signed in to CodeHub (codehub.com) on a new laptop a minute ago.",
    answer: "legitimate",
    hint: "Does this match something you just did? Is anything being demanded?",
    explanation: "This is a genuine security notification that matches your own action. It uses the real domain, addresses you by username, and tells you to ignore it if it was you.",
    evidence: ["Sender domain exactly matches codehub.com", "Timing matches your own sign-in", "Uses your actual username", "No urgency or credential request — 'you can ignore this message'"],
    recommendation: "Good security alerts are worth reading. If one ever doesn't match your activity, navigate to the site yourself and change your password.",
  },
];
