import { createHash } from "node:crypto";

const MAX_PREVIEW_LENGTH = 2000;

// Redacts obvious secret-shaped substrings before anything is persisted or transmitted.
const SECRET_PATTERNS: RegExp[] = [
  /(-----BEGIN [A-Z ]*PRIVATE KEY-----)[\s\S]*?(-----END [A-Z ]*PRIVATE KEY-----)/g,
  /\b(sk-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|gho_[A-Za-z0-9]{20,}|AIza[A-Za-z0-9_-]{20,})\b/g,
  /\b([A-Za-z0-9_]*(?:API|SECRET|TOKEN|PASSWORD|KEY)[A-Za-z0-9_]*\s*[:=]\s*)([^\s"']{4,})/gi,
];

export function redactSecrets(text: string): string {
  let result = text;
  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern, (match, ...groups) => {
      if (groups.length >= 2 && typeof groups[0] === "string" && typeof groups[1] === "string") {
        return `${groups[0]}[REDACTED]`;
      }
      return "[REDACTED]";
    });
  }
  return result;
}

export function hashOutput(stdout: string, stderr: string): string {
  return createHash("sha256").update(stdout).update("\0").update(stderr).digest("hex");
}

export function previewOutput(text: string): string {
  const redacted = redactSecrets(text);
  return redacted.length > MAX_PREVIEW_LENGTH
    ? `${redacted.slice(0, MAX_PREVIEW_LENGTH)}\n… [truncated]`
    : redacted;
}
