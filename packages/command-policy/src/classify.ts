import type { CommandClassification, RiskLevel } from "./types.ts";

interface Rule {
  test: RegExp;
  category: string;
  reason: string;
}

// Checked in order from most to least dangerous. The first matching rule wins,
// so a specific dangerous pattern (e.g. `cat .env`) must be listed under a
// higher-danger level than any broad pattern it would otherwise also match
// (e.g. generic `cat <file>` under READ).
const RULES: Record<Exclude<RiskLevel, "read">, Rule[]> = {
  blocked: [
    {
      test: /(^|[\s;&|])(cat|type|less|more|head|tail)\s+.*(\.env(\.\w+)?|\.pem$|\.key$|id_rsa|credentials\.json|secrets?\.(json|ya?ml))/i,
      category: "credential-extraction",
      reason: "Reads a file that typically holds secrets or private keys.",
    },
    {
      test: /(^|[\s;&|])(printenv|env)\s*(\||$)|process\.env\b.*console\.log/i,
      category: "credential-extraction",
      reason: "Dumps the process environment, which may contain secrets.",
    },
    { test: /aws\s+configure\s+list|gcloud\s+auth\s+print-access-token/i, category: "credential-extraction", reason: "Prints cloud provider credentials." },
    { test: /rm\s+-rf\s+(\/|\/\*|~|~\/\*|C:\\|\*)\s*$/i, category: "destructive-system", reason: "Recursively deletes the filesystem root or home directory." },
    { test: /\bformat\s+[a-z]:/i, category: "disk-operation", reason: "Formats a disk volume." },
    { test: /\b(diskpart|fdisk|parted|mkfs(\.\w+)?)\b/i, category: "disk-operation", reason: "Directly manipulates disk partitions or filesystems." },
    { test: /\bdd\s+if=.*of=\/dev\//i, category: "disk-operation", reason: "Raw disk write via dd." },
    { test: /\b(shutdown|reboot|halt)\b/i, category: "destructive-system", reason: "Shuts down or restarts the machine." },
    { test: /\breg\s+(add|delete)\b/i, category: "registry-manipulation", reason: "Modifies the Windows registry." },
    { test: /\bregedit\b/i, category: "registry-manipulation", reason: "Opens/modifies the Windows registry." },
    { test: /\b(sudo|runas)\b|Start-Process\s+.*-Verb\s+RunAs/i, category: "privilege-escalation", reason: "Attempts to run as an elevated/different user." },
    { test: /\bsu\s+-/i, category: "privilege-escalation", reason: "Switches to another user account." },
    { test: /\bcrontab\s+-e\b|\bschtasks\s+\/create\b|New-ScheduledTask|launchctl\s+load/i, category: "persistence", reason: "Installs a scheduled task or cron job (persistence mechanism)." },
    { test: /git\s+(checkout\s+-b|branch)\s+(main|master)\b/i, category: "protected-branch", reason: "Refuses to create a branch named main/master — release branches must never overwrite the protected default branch." },
    { test: /git\s+push\b.*\b(main|master)\b/i, category: "protected-branch", reason: "Refuses to push directly to main/master." },
  ],
  critical: [
    { test: /git\s+push\s+.*(--force|-f)\b/i, category: "production", reason: "Force-pushes, which can overwrite remote history." },
    { test: /\bvercel\s+.*--prod\b|\bfirebase\s+deploy\b/i, category: "production", reason: "Deploys to a production environment." },
    { test: /\bDROP\s+(TABLE|DATABASE|SCHEMA)\b/i, category: "database", reason: "Drops a database object." },
    { test: /\bTRUNCATE\s+TABLE\b/i, category: "database", reason: "Irreversibly clears a database table." },
    { test: /\bDELETE\s+FROM\s+\w+\s*;?\s*$/i, category: "database", reason: "Deletes all rows from a table (no WHERE clause)." },
    { test: /\bkubectl\s+delete\b|\bterraform\s+(apply|destroy)\b/i, category: "infrastructure", reason: "Changes or destroys live infrastructure." },
    { test: /\b(vercel|firebase)\s+.*secrets?:?(set|add)\b/i, category: "credentials", reason: "Sets a production secret/credential." },
    { test: /\bnet\s+user\b|\buseradd\b|\bpasswd\b/i, category: "system", reason: "Modifies OS-level user accounts." },
  ],
  high: [
    { test: /\brm\s+-rf?\s+\S/i, category: "destructive-file", reason: "Recursively/forcefully deletes files or directories." },
    { test: /\b(del|erase)\s+.*\/[sq]/i, category: "destructive-file", reason: "Deletes files/directories without confirmation." },
    { test: /\brmdir\s+\/s\b/i, category: "destructive-file", reason: "Recursively removes a directory tree." },
    { test: /Remove-Item\s+.*-Recurse.*-Force|Remove-Item\s+.*-Force.*-Recurse/i, category: "destructive-file", reason: "Recursively/forcefully deletes files or directories." },
    { test: /git\s+reset\s+--hard\b/i, category: "destructive-git", reason: "Discards uncommitted local changes irreversibly." },
    { test: /git\s+clean\s+-[a-z]*f/i, category: "destructive-git", reason: "Permanently deletes untracked files." },
    { test: /git\s+push\b/i, category: "remote-write", reason: "Pushes local commits to a remote repository." },
    { test: /\bchmod\s+-R\s+777\b|\bchown\s+-R\b/i, category: "permissions", reason: "Recursively changes file permissions/ownership." },
    { test: /\b(npm|pnpm|yarn)\s+(un)?(install|add)?\s*(remove|uninstall)\b/i, category: "dependency-removal", reason: "Removes a project dependency." },
    { test: /\bALTER\s+TABLE\b/i, category: "database", reason: "Alters a database table schema." },
    { test: /docker\s+(rm|system\s+prune)\b/i, category: "destructive-container", reason: "Removes containers/images or prunes docker state." },
    { test: /\bkill\s+-9\b/i, category: "process-control", reason: "Force-kills a process." },
  ],
  medium: [
    { test: /\b(npm|pnpm|yarn)\s+(install|add|i)\b/i, category: "dependency-install", reason: "Installs project dependencies." },
    { test: /\bpip\s+install\b/i, category: "dependency-install", reason: "Installs Python dependencies." },
    { test: /git\s+(add|commit)\b/i, category: "vcs-write", reason: "Stages or commits changes to version control." },
    { test: /git\s+checkout\s+-b\b|git\s+branch\b/i, category: "vcs-write", reason: "Creates a new branch." },
    {
      test: /\bnpx\s+(?!(playwright|vitest|jest|mocha|eslint|tsc)\b)/i,
      category: "package-execution",
      reason: "Downloads and executes an npm package.",
    },
    { test: /docker\s+(build|run)\b/i, category: "container-execution", reason: "Builds or runs a container image." },
  ],
  low: [
    { test: /\b(npm|pnpm|yarn)\s+(run\s+)?test\b|\b(vitest|jest|mocha)\b/i, category: "test", reason: "Runs the project's existing test suite." },
    { test: /playwright\s+test\b/i, category: "test", reason: "Runs Playwright end-to-end tests." },
    { test: /\b(npm|pnpm|yarn)\s+(run\s+)?lint\b|\beslint\b/i, category: "lint", reason: "Runs the linter." },
    { test: /\btsc\s+--noEmit\b|\b(npm|pnpm|yarn)\s+(run\s+)?typecheck\b/i, category: "typecheck", reason: "Runs the TypeScript compiler in check-only mode." },
    { test: /\b(npm|pnpm|yarn)\s+(run\s+)?build\b/i, category: "build", reason: "Runs the project's build script." },
  ],
};

const READ_RULES: Rule[] = [
  { test: /^\s*(pwd|ls|dir)\b/i, category: "list", reason: "Lists files/directories." },
  { test: /git\s+(status|diff|log|show|branch\s+--list|remote\s+-v)\b/i, category: "vcs-read", reason: "Reads repository state without modifying it." },
  { test: /^\s*(cat|type|head|tail|less|more)\s+\S/i, category: "file-read", reason: "Reads a non-sensitive file." },
  { test: /^\s*(find|grep|rg|Select-String)\b/i, category: "search", reason: "Searches files/text." },
  { test: /^\s*(which|where|node\s+-v|npm\s+-v|pnpm\s+-v)\b/i, category: "inspect", reason: "Inspects tool/environment info." },
  { test: /^\s*wc\s+/i, category: "inspect", reason: "Counts lines/words/bytes in a file." },
  { test: /^\s*echo\s+[^>]*$/i, category: "inspect", reason: "Prints text with no redirection." },
  { test: /\b(npm|pnpm|yarn)\s+audit\b/i, category: "dependency-audit", reason: "Reports known vulnerabilities without changing anything." },
];

export function classifyCommand(command: string): CommandClassification {
  const trimmed = command.trim();

  for (const risk of ["blocked", "critical", "high", "medium", "low"] as const) {
    for (const rule of RULES[risk]) {
      if (rule.test.test(trimmed)) {
        return { risk, category: rule.category, reason: rule.reason };
      }
    }
  }

  for (const rule of READ_RULES) {
    if (rule.test.test(trimmed)) {
      return { risk: "read", category: rule.category, reason: rule.reason };
    }
  }

  return {
    risk: "high",
    category: "unrecognized",
    reason: "Command did not match any known pattern; defaulting to high risk pending human review.",
  };
}
