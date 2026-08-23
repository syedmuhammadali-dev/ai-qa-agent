import type { SecuritySeverity } from "./types.ts";

export interface SourcePattern {
  category: string;
  problem: string;
  severity: SecuritySeverity;
  test: RegExp;
  recommendation: string;
}

export const SOURCE_PATTERNS: SourcePattern[] = [
  {
    category: "secrets",
    problem: "Hardcoded API key committed to source",
    severity: "critical",
    test: /\b(sk-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|gho_[A-Za-z0-9]{20,}|AIza[A-Za-z0-9_-]{20,}|AKIA[A-Z0-9]{12,})\b/,
    recommendation: "Revoke this key immediately, remove it from git history, and load it from an environment variable instead.",
  },
  {
    category: "secrets",
    problem: "Hardcoded private key committed to source",
    severity: "critical",
    test: /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    recommendation: "Revoke this key immediately, remove it from git history, and load it from a secrets manager instead.",
  },
  {
    category: "secrets",
    problem: "Hardcoded secret-shaped assignment",
    severity: "high",
    test: /\b(?:api[_-]?key|secret|password|token)\s*[:=]\s*["'][^"'\s]{8,}["']/i,
    recommendation: "Move this value to an environment variable and never commit real credentials.",
  },
  {
    category: "injection",
    problem: "Use of eval() — arbitrary code execution risk",
    severity: "high",
    test: /\beval\s*\(/,
    recommendation: "Avoid eval(); use a safe parser (e.g. JSON.parse) or refactor to not need dynamic code execution.",
  },
  {
    category: "xss",
    problem: "dangerouslySetInnerHTML without visible sanitization",
    severity: "medium",
    test: /dangerouslySetInnerHTML\s*=\s*\{\{\s*__html:\s*(?!DOMPurify|sanitize)/i,
    recommendation: "Sanitize the HTML (e.g. with DOMPurify) before rendering it, or avoid raw HTML injection entirely.",
  },
  {
    category: "injection",
    problem: "Possible SQL built via string interpolation",
    severity: "high",
    test: /\b(SELECT|INSERT|UPDATE|DELETE)\b[^;`]*\$\{/i,
    recommendation: "Use parameterized queries/prepared statements instead of interpolating values into SQL strings.",
  },
  {
    category: "cors",
    problem: "CORS wildcard origin",
    severity: "medium",
    test: /Access-Control-Allow-Origin['"]?\s*[:,]\s*['"]\*['"]|origin\s*:\s*['"]\*['"]/,
    recommendation: "Restrict CORS to an explicit allowlist of origins instead of \"*\", especially for authenticated endpoints.",
  },
];
