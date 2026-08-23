import type { FileProvider } from "@ai-qa-agent/project-analyzer";
import { SOURCE_PATTERNS } from "./patterns.ts";
import type { SecurityFinding, SecurityScanResult } from "./types.ts";

const SCANNABLE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".env", ".json", ".yml", ".yaml"];
const MAX_FILES = 2000;
const MAX_FILE_SIZE = 500_000; // skip anything absurdly large (generated/minified bundles)

function isScannable(path: string): boolean {
  if (path.endsWith(".min.js") || path.includes("/dist/") || path.includes("/build/")) return false;
  return SCANNABLE_EXTENSIONS.some((ext) => path.endsWith(ext));
}

// Cheap, not a real parser: skips lines that are *entirely* a comment, which
// is enough to avoid the common false positive of a pattern name mentioned in
// an explanatory comment (e.g. "// avoid eval() here").
function isCommentLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith("*");
}

function checkTrackedEnvFile(files: string[]): SecurityFinding[] {
  const tracked = files.filter((f) => {
    const base = f.split("/").pop() ?? f;
    return base === ".env" || (base.startsWith(".env.") && !base.endsWith(".example") && base !== ".env.example");
  });
  return tracked.map((f) => ({
    category: "secrets",
    problem: "A .env file is tracked in the repository",
    evidence: f,
    severity: "critical" as const,
    recommendation: "Remove it from git (git rm --cached), add it to .gitignore, and rotate any secrets it contained.",
  }));
}

export async function scanForSecurityFindings(provider: FileProvider): Promise<SecurityScanResult> {
  const allFiles = await provider.listFiles();
  const findings: SecurityFinding[] = [...checkTrackedEnvFile(allFiles)];

  const scannableFiles = allFiles.filter(isScannable).slice(0, MAX_FILES);
  let filesScanned = 0;

  for (const file of scannableFiles) {
    const content = await provider.readFile(file);
    if (!content || content.length > MAX_FILE_SIZE) continue;
    filesScanned++;

    const lines = content.split("\n");
    for (const pattern of SOURCE_PATTERNS) {
      for (let i = 0; i < lines.length; i++) {
        if (isCommentLine(lines[i])) continue;
        if (pattern.test.test(lines[i])) {
          findings.push({
            category: pattern.category,
            problem: pattern.problem,
            evidence: `${file}:${i + 1}`,
            severity: pattern.severity,
            recommendation: pattern.recommendation,
          });
        }
      }
    }
  }

  return { filesScanned, findings };
}
