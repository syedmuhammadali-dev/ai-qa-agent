#!/usr/bin/env node
import { Command } from "commander";
import { evaluateCommand } from "@ai-qa-agent/command-policy";
import { createRunWorkspace, hashOutput, previewOutput, pruneRuns } from "@ai-qa-agent/agent-core";
import { clearSession, loadSession, requireSession, saveSession } from "./config.ts";
import { exchangePairingCode, fetchPermissionMode, submitCommandAudit } from "./api.ts";
import { askApproval, askEditedCommand } from "./prompt.ts";
import { runCommand } from "./exec.ts";

const DEFAULT_RUN_RETENTION = 10;

const program = new Command();
program.name("ai-qa-agent").description("Local agent for the AI QA Agent platform").version("0.1.0");

program
  .command("connect <code>")
  .description("Pair this machine with a project using a code generated in the dashboard's Settings page")
  .option("--url <apiUrl>", "Dashboard base URL", "http://localhost:3000")
  .action(async (code: string, opts: { url: string }) => {
    const apiUrl = opts.url.replace(/\/$/, "");
    const session = await exchangePairingCode(apiUrl, code);
    saveSession({
      apiUrl,
      projectId: session.projectId,
      projectName: session.projectName,
      sessionToken: session.sessionToken,
      deviceLabel: "local",
    });
    console.log(`Connected to "${session.projectName}" (${session.projectId}) at ${apiUrl}`);
  });

program
  .command("disconnect")
  .description("Forget the saved connection on this machine")
  .action(() => {
    clearSession();
    console.log("Disconnected. Revoke the session from the dashboard Settings page if needed.");
  });

program
  .command("status")
  .description("Show the current connection")
  .action(() => {
    const session = loadSession();
    if (!session) {
      console.log("Not connected. Run: ai-qa-agent connect <code>");
      return;
    }
    console.log(`Connected to "${session.projectName}" (${session.projectId})`);
    console.log(`Dashboard: ${session.apiUrl}`);
  });

program
  .command("run <command...>")
  .description("Run a command through the command policy engine, with audit logging")
  .option("--reason <reason>", "Why this command is being run", "Manual run via ai-qa-agent CLI")
  .option("--cwd <dir>", "Working directory", process.cwd())
  .action(async (commandParts: string[], opts: { reason: string; cwd: string }) => {
    const session = requireSession();
    const command = commandParts.join(" ");

    // Fail closed: without a live, authorized permission mode from the dashboard,
    // there is no basis to run anything (also true if the session was revoked).
    let mode;
    try {
      mode = await fetchPermissionMode(session.apiUrl, session.sessionToken, session.projectId);
    } catch (err) {
      console.error(
        `Could not verify authorization with the dashboard (${err instanceof Error ? err.message : err}). Refusing to run.`
      );
      process.exitCode = 1;
      return;
    }
    const evaluation = evaluateCommand(command, mode);

    console.log(`\nCommand: ${command}`);
    console.log(`Risk: ${evaluation.risk} (${evaluation.category}) — ${evaluation.reason}`);
    console.log(`Permission mode: ${mode} → ${evaluation.decision}\n`);

    if (evaluation.decision === "blocked") {
      console.error("Blocked by command policy. This command is never auto-run and cannot be approved.");
      await submitCommandAudit(session.apiUrl, session.sessionToken, session.projectId, {
        command,
        reason: opts.reason,
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
      process.exitCode = 1;
      return;
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
        reason: opts.reason,
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
      return;
    }

    const workspace = await createRunWorkspace(opts.cwd);
    await pruneRuns(opts.cwd, DEFAULT_RUN_RETENTION).catch(() => []);

    const result = await runCommand(finalCommand, opts.cwd, workspace.logsDir);

    await submitCommandAudit(session.apiUrl, session.sessionToken, session.projectId, {
      command,
      reason: opts.reason,
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
    }).catch((err) => console.error(`(failed to record audit entry: ${err.message})`));

    process.exitCode = result.exitCode ?? 1;
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
