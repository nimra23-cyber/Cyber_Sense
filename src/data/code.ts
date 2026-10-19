export interface CodeChallenge {
  id: string;
  level: 1 | 2 | 3;
  title: string;
  scenario: string;
  vulnerable: string;
  evidenceLines: number[];
  options: { id: string; label: string }[];
  answer: string;
  cwe: string;
  cweName: string;
  concept: string;
  why: string;
  safe: string;
  takeaway: string;
}

const OPTIONS = [
  { id: "sqli", label: "SQL injection via string-built query" },
  { id: "secrets", label: "Hardcoded credentials / secrets" },
  { id: "cmdi", label: "OS command injection from untrusted input" },
  { id: "none", label: "No significant weakness" },
];

// Predefined, display-only code. Nothing here is ever executed.
export const CODE_CHALLENGES: CodeChallenge[] = [
  {
    id: "c1", level: 1, title: "Student Lookup", scenario: "A small Flask helper looks up a student by username from a search box.",
    vulnerable: `import sqlite3

def find_student(username):
    conn = sqlite3.connect("school.db")
    cur = conn.cursor()
    query = "SELECT * FROM students WHERE username = '" + username + "'"
    cur.execute(query)
    return cur.fetchall()`,
    evidenceLines: [6, 7], options: OPTIONS, answer: "sqli",
    cwe: "CWE-89", cweName: "Improper Neutralization of Special Elements used in an SQL Command",
    concept: "SQL injection happens when untrusted input is concatenated into a query, letting it change the query's structure instead of being treated as data.",
    why: "A username like ' OR '1'='1 turns the WHERE clause into a condition that is always true, returning every student.",
    safe: `import sqlite3

def find_student(username):
    conn = sqlite3.connect("school.db")
    cur = conn.cursor()
    cur.execute("SELECT * FROM students WHERE username = ?", (username,))
    return cur.fetchall()`,
    takeaway: "Always use parameterised queries (placeholders). Never build SQL with string concatenation or f-strings.",
  },
  {
    id: "c2", level: 2, title: "Weather Report Uploader", scenario: "A script uploads daily reports to a cloud storage bucket and is shared on a public code repository.",
    vulnerable: `import requests

API_KEY = "sk_live_9f8a7d6c5b4a3e2f1"
DB_PASSWORD = "Winter2026!"

def upload_report(path):
    with open(path, "rb") as f:
        return requests.post(
            "https://storage.example.com/upload",
            headers={"Authorization": f"Bearer {API_KEY}"},
            files={"file": f},
        )`,
    evidenceLines: [3, 4], options: OPTIONS, answer: "secrets",
    cwe: "CWE-798", cweName: "Use of Hard-coded Credentials",
    concept: "Secrets written in source code get copied everywhere the code goes: repositories, backups, logs, and screenshots.",
    why: "Anyone who can read the repository can use the API key and password. Rotating them requires a code change and redeploy.",
    safe: `import os
import requests

API_KEY = os.environ["STORAGE_API_KEY"]  # set in deployment secrets

def upload_report(path):
    with open(path, "rb") as f:
        return requests.post(
            "https://storage.example.com/upload",
            headers={"Authorization": f"Bearer {API_KEY}"},
            files={"file": f},
        )`,
    takeaway: "Load secrets from environment variables or a secrets manager, add secret scanning, and rotate any secret that was ever committed.",
  },
  {
    id: "c3", level: 3, title: "Network Ping Tool", scenario: "An internal admin web page lets staff type a hostname to check whether it's reachable.",
    vulnerable: `import os
from flask import request

@app.route("/ping")
def ping():
    host = request.args.get("host", "")
    result = os.popen("ping -c 1 " + host).read()
    return f"<pre>{result}</pre>"`,
    evidenceLines: [6, 7], options: OPTIONS, answer: "cmdi",
    cwe: "CWE-78", cweName: "Improper Neutralization of Special Elements used in an OS Command",
    concept: "Passing untrusted input to a shell lets special characters like ; or && chain additional commands.",
    why: "Input such as example.com; cat /etc/passwd would run a second command on the server with the app's privileges.",
    safe: `import re
import subprocess
from flask import request, abort

HOST_RE = re.compile(r"^[a-zA-Z0-9.-]{1,253}$")

@app.route("/ping")
def ping():
    host = request.args.get("host", "")
    if not HOST_RE.match(host):
        abort(400)
    result = subprocess.run(["ping", "-c", "1", host],
                            capture_output=True, text=True, timeout=5)
    return {"output": result.stdout}`,
    takeaway: "Validate input against an allow-list and call programs with an argument list (no shell). Avoid os.system / os.popen with user data.",
  },
];
