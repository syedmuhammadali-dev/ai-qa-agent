import { evaluateCommand } from "@ai-qa-agent/command-policy";
import { createRunWorkspace, hashOutput, previewOutput, pruneRuns } from "@ai-qa-agent/agent-core";
import type { LocalSession } from "./config.ts";
import { createRun, fetchPermissionMode, submitCommandAudit, updateRun } from "./api.ts";
import { askApproval, askEditedCommand } from "./prompt.ts";
import { runCommand } from "./exec.ts";

const DEFAULT_RUN_RETENTION = 10;
const LOG_STREAM_THROTTLE_MS = 500;

/** Full policy → (approval) → execute → audit pipeline shared by every CLI
 * command that ultimately runs something. Returns the process exit code. */
export async function runCommandThroughPolicy(
  session: LocalSession,
  command: string,
  reason: string,
  cwd: string
): Promise<number> {
  let mode;
  try {
    mode = await fetchPermissionMode(session.apiUrl, session.sessionToken, session.projectId);
  } catch (err) {
    console.error(
      `Could not verify authorization with the dashboard (${err instanceof Error ? err.message : err}). Refusing to run.`
    );
    return 1;
  }
  const evaluation = evaluateCommand(command, mode);

  console.log(`\nCommand: ${command}`);
  console.log(`Risk: ${evaluation.risk} (${evaluation.category}) — ${evaluation.reason}`);
  console.log(`Permission mode: ${mode} → ${evaluation.decision}\n`);

  if (evaluation.decision === "blocked") {
    console.error("Blocked by command policy. This command is never auto-run and cannot be approved.");
    await submitCommandAudit(session.apiUrl, session.sessionToken, session.projectId, {
      command,
      reason,
      risk: evaluation.risk,
      category: evaluation.category,
      decision: evaluation.decision,
      permissionMode: mode,
      approved: false,
      exitCode: null,
      durationMs: 0,
      outputHash: "",
      stdoutPreview: "",
      stderrPreview: "",
    }).catch((err) => console.error(`(failed to record audit entry: ${err.message})`));
    return 1;
  }

  let finalCommand = command;
  let approved = evaluation.decision === "auto_allow";

  if (evaluation.decision === "requires_approval") {
    const choice = await askApproval();
    if (choice === "deny") {
      approved = false;
    } else if (choice === "edit") {
      finalCommand = await askEditedCommand(command);
      approved = true;
    } else {
      approved = true;
    }
  }

  if (!approved) {
    console.log("Denied by user.");
    await submitCommandAudit(session.apiUrl, session.sessionToken, session.projectId, {
      command,
      reason,
      risk: evaluation.risk,
      category: evaluation.category,
      decision: evaluation.decision,
      permissionMode: mode,
      approved: false,
      exitCode: null,
      durationMs: 0,
      outputHash: "",
      stdoutPreview: "",
      stderrPreview: "",
    }).catch((err) => console.error(`(failed to record audit entry: ${err.message})`));
    return 0;
  }

  const workspace = await createRunWorkspace(cwd);
  await pruneRuns(cwd, DEFAULT_RUN_RETENTION).catch(() => []);

  const runId = await createRun(
    session.apiUrl,
    session.sessionToken,
    session.projectId,
    finalCommand,
    evaluation.category
  ).catch((err) => {
    console.error(`(failed to create live run record: ${err instanceof Error ? err.message : err})`);
    return null;
  });

  let liveLog = "";
  let lastFlush = 0;
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    if (!runId) return;
    lastFlush = Date.now();
    void updateRun(session.apiUrl, session.sessionToken, session.projectId, runId, { log: liveLog });
  };

  const onOutput = (chunk: string) => {
    liveLog += chunk;
    if (!runId) return;
    const now = Date.now();
    if (now - lastFlush >= LOG_STREAM_THROTTLE_MS) {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      flush();
    } else if (!flushTimer) {
      flushTimer = setTimeout(flush, LOG_STREAM_THROTTLE_MS);
    }
  };

  const result = await runCommand(finalCommand, cwd, workspace.logsDir, onOutput);

  if (flushTimer) clearTimeout(flushTimer);
  if (runId) {
    await updateRun(session.apiUrl, session.sessionToken, session.projectId, runId, {
      log: `${result.stdout}${result.stderr ? `\n--- stderr ---\n${result.stderr}` : ""}`,
      status: result.exitCode === 0 ? "completed" : "failed",
      exitCode: result.exitCode,
      finishedAt: Date.now(),
    });
  }

  await submitCommandAudit(session.apiUrl, session.sessionToken, session.projectId, {
    command,
    reason,
    risk: evaluation.risk,
    category: evaluation.category,
    decision: evaluation.decision,
    permissionMode: mode,
    approved: true,
    editedFromCommand: finalCommand !== command ? command : undefined,
    exitCode: result.exitCode,
    durationMs: result.durationMs,
    outputHash: hashOutput(result.stdout, result.stderr),
    stdoutPreview: previewOutput(result.stdout),
    stderrPreview: previewOutput(result.stderr),
    runId: runId ?? undefined,
  }).catch((err) => console.error(`(failed to record audit entry: ${err.message})`));

  return result.exitCode ?? 1;
}
