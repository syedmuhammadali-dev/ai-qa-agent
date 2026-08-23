import { mkdir, readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";

export interface RunWorkspace {
  runId: string;
  root: string;
  sourceDir: string;
  screenshotsDir: string;
  videosDir: string;
  tracesDir: string;
  logsDir: string;
  reportsDir: string;
}

const SUBDIRS = ["source", "screenshots", "videos", "traces", "logs", "reports"] as const;

export function generateRunId(): string {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const rand = Math.random().toString(36).slice(2, 8);
  return `run-${ts}-${rand}`;
}

export async function createRunWorkspace(projectRoot: string, runId = generateRunId()): Promise<RunWorkspace> {
  const root = join(projectRoot, ".ai-qa", "runs", runId);
  for (const sub of SUBDIRS) {
    await mkdir(join(root, sub), { recursive: true });
  }
  return {
    runId,
    root,
    sourceDir: join(root, "source"),
    screenshotsDir: join(root, "screenshots"),
    videosDir: join(root, "videos"),
    tracesDir: join(root, "traces"),
    logsDir: join(root, "logs"),
    reportsDir: join(root, "reports"),
  };
}

/** Deletes run directories beyond `keep` most recent, oldest first. Never touches the user's project files outside .ai-qa/runs. */
export async function pruneRuns(projectRoot: string, keep: number): Promise<string[]> {
  const runsDir = join(projectRoot, ".ai-qa", "runs");
  let entries: string[];
  try {
    entries = await readdir(runsDir);
  } catch {
    return [];
  }

  const withTimes = await Promise.all(
    entries.map(async (name) => {
      const full = join(runsDir, name);
      const s = await stat(full).catch(() => null);
      return s?.isDirectory() ? { name, full, mtime: s.mtimeMs } : null;
    })
  );

  const dirs = withTimes.filter((e): e is { name: string; full: string; mtime: number } => e !== null);
  dirs.sort((a, b) => b.mtime - a.mtime);

  const toRemove = dirs.slice(keep);
  for (const dir of toRemove) {
    await rm(dir.full, { recursive: true, force: true });
  }
  return toRemove.map((d) => d.name);
}
