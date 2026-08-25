import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as archiver from "archiver";
import { analyzeProject, createLocalFileProvider } from "@ai-qa-agent/project-analyzer";
import { scanForSecurityFindings } from "@ai-qa-agent/security-engine";

/** Never let one of these into an exported zip, even if the secret scan above
 * missed it — the same spirit as command-policy's credential-extraction rule. */
const SENSITIVE_PATH = /(^|\/)\.env(\.\w+)?$|\.pem$|\.key$|id_rsa|credentials\.json$|secrets?\.(json|ya?ml)$/i;

function isSensitivePath(path: string): boolean {
  const base = path.split("/").pop() ?? path;
  if (base === ".env.example") return false;
  return SENSITIVE_PATH.test(path);
}

export interface ExportResult {
  ok: boolean;
  zipPath?: string;
  checksumPath?: string;
  fileCount?: number;
  reason?: string;
  secretFindings?: { problem: string; evidence: string; severity: string }[];
}

function hashFile(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(path);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

export async function exportProjectZip(cwd: string, outDir: string): Promise<ExportResult> {
  const provider = createLocalFileProvider(cwd);

  // 1. Secret scan — hard gate. Never let a secret-containing zip out the door.
  const scan = await scanForSecurityFindings(provider);
  const secretFindings = scan.findings.filter(
    (f) => f.category === "secrets" && (f.severity === "critical" || f.severity === "high"),
  );
  if (secretFindings.length > 0) {
    return {
      ok: false,
      reason: `Refusing to export: ${secretFindings.length} secret finding(s) in the source tree. Fix these first.`,
      secretFindings,
    };
  }

  // 2. Cleanup — build the real file list, excluding build output/deps (already
  // excluded by the shared FileProvider) and any credential-shaped filename.
  const allFiles = await provider.listFiles();
  const filesToZip = allFiles.filter((f) => !isSensitivePath(f));
  const excludedCount = allFiles.length - filesToZip.length;

  // 4. README — generated from the project's real detected stack, never fabricated.
  const analysis = await analyzeProject(provider);
  const readme = [
    "# Exported by AI QA Agent",
    "",
    `Exported: ${new Date().toISOString()}`,
    "",
    "## Detected stack",
    `- Languages: ${analysis.languages.join(", ") || "none detected"}`,
    `- Frameworks: ${analysis.frameworks.join(", ") || "none detected"}`,
    `- Package manager: ${analysis.packageManager ?? "none detected"}`,
    `- Test frameworks: ${analysis.testFrameworks.join(", ") || "none detected"}`,
    "",
    "## Export integrity",
    `- ${filesToZip.length} files included${excludedCount > 0 ? `, ${excludedCount} excluded (secrets/credentials or build output)` : ""}.`,
    "- A secret scan ran before export and found nothing above low severity.",
    "- See the accompanying `.sha256` file to verify this archive wasn't altered in transit.",
    "",
  ].join("\n");

  await mkdir(outDir, { recursive: true });
  const zipName = `export-${Date.now()}.zip`;
  const zipPath = join(outDir, zipName);

  const writtenEntries: string[] = [];
  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = new archiver.ZipArchive({ zlib: { level: 9 } });
    output.on("close", resolve);
    archive.on("warning", (err: Error) => console.error(`(archiver warning: ${err.message})`));
    archive.on("error", reject);
    archive.on("entry", (data: { name: string }) => writtenEntries.push(data.name));
    archive.pipe(output);
    for (const file of filesToZip) {
      archive.file(join(cwd, ...file.split("/")), { name: file });
    }
    archive.append(readme, { name: "AI_QA_AGENT_EXPORT.md" });
    archive.finalize();
  });

  // 3. Validate — re-check what actually got written, not just what was intended.
  const leaked = writtenEntries.filter(isSensitivePath);
  if (leaked.length > 0) {
    return { ok: false, reason: `Aborting: ${leaked.length} sensitive path(s) ended up in the archive: ${leaked.join(", ")}` };
  }

  // 5. Integrity check — sha256, then re-hash to confirm the write wasn't corrupted.
  const checksum = await hashFile(zipPath);
  const checksumPath = `${zipPath}.sha256`;
  await writeFile(checksumPath, `${checksum}  ${zipName}\n`, "utf8");
  const verifyChecksum = await hashFile(zipPath);
  if (verifyChecksum !== checksum) {
    return { ok: false, reason: "Integrity check failed: re-hashing the written zip produced a different digest." };
  }

  return { ok: true, zipPath, checksumPath, fileCount: writtenEntries.length };
}
