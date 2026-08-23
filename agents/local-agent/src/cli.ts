#!/usr/bin/env node
import { Command } from "commander";
import { analyzeProject, createLocalFileProvider } from "@ai-qa-agent/project-analyzer";
import { planTestCommand } from "@ai-qa-agent/qa-engine";
import { runSmokeCheck } from "@ai-qa-agent/browser-agent";
import { checkSecurityHeaders, discoverOpenApiSpec, probeEndpoint } from "@ai-qa-agent/api-tester";
import { createRunWorkspace, hashOutput, previewOutput, pruneRuns } from "@ai-qa-agent/agent-core";
import { clearSession, loadSession, requireSession, saveSession } from "./config.ts";
import { exchangePairingCode, submitCommandAudit } from "./api.ts";
import { runCommandThroughPolicy } from "./run-through-policy.ts";

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
    const exitCode = await runCommandThroughPolicy(session, commandParts.join(" "), opts.reason, opts.cwd);
    process.exitCode = exitCode;
  });

program
  .command("analyze")
  .description("Detect framework, package manager, test framework, DB/ORM, and auth from real files")
  .option("--cwd <dir>", "Project directory", process.cwd())
  .action(async (opts: { cwd: string }) => {
    const provider = createLocalFileProvider(opts.cwd);
    const analysis = await analyzeProject(provider);

    const line = (label: string, values: string[] | string | null) =>
      console.log(`${label}: ${Array.isArray(values) ? (values.length ? values.join(", ") : "(none detected)") : (values ?? "(none detected)")}`);

    line("Languages", analysis.languages);
    line("Frameworks", analysis.frameworks);
    line("Package manager", analysis.packageManager);
    line("Test frameworks", analysis.testFrameworks);
    line("Databases", analysis.databases);
    line("ORMs", analysis.orms);
    line("Auth", analysis.authProviders);
    line("Linting", analysis.linting);
    line("Deployment", analysis.deployment);
    line("CI/CD", analysis.cicd);
    line("Observability", analysis.observability);
  });

program
  .command("test")
  .description("Detect the project's test setup and run it through the command policy engine")
  .option("--cwd <dir>", "Project directory", process.cwd())
  .action(async (opts: { cwd: string }) => {
    const session = requireSession();
    const provider = createLocalFileProvider(opts.cwd);
    const analysis = await analyzeProject(provider);
    const pkgRaw = await provider.readFile("package.json");
    const scripts = pkgRaw ? (JSON.parse(pkgRaw).scripts as Record<string, string> | undefined) : undefined;

    const plan = planTestCommand(analysis, scripts);
    if (!plan) {
      console.error(
        `No test framework detected (frameworks seen: ${analysis.testFrameworks.join(", ") || "none"}). Nothing to run.`
      );
      process.exitCode = 1;
      return;
    }

    console.log(`Detected test setup: ${analysis.testFrameworks.join(", ") || "none"}`);
    console.log(plan.reason);

    const exitCode = await runCommandThroughPolicy(session, plan.command, "Detected test run via ai-qa-agent test", opts.cwd);
    process.exitCode = exitCode;
  });

program
  .command("browser-check <url>")
  .description("Navigate to a URL with a real browser and report console errors, failed requests, and a screenshot")
  .option("--reason <reason>", "Why this check is being run", "Manual browser check via ai-qa-agent CLI")
  .option("--cwd <dir>", "Working directory (workspace root for the screenshot)", process.cwd())
  .action(async (url: string, opts: { reason: string; cwd: string }) => {
    const session = requireSession();
    const workspace = await createRunWorkspace(opts.cwd);
    await pruneRuns(opts.cwd, 10).catch(() => []);

    console.log(`\nNavigating to ${url} ...`);
    const start = Date.now();
    const result = await runSmokeCheck(url, workspace.screenshotsDir);
    const durationMs = Date.now() - start;

    console.log(`Final URL: ${result.finalUrl}`);
    console.log(`HTTP status: ${result.httpStatus ?? "(navigation failed)"}`);
    console.log(`Title: ${result.title || "(empty)"}`);
    console.log(`Console errors: ${result.consoleErrors.length}`);
    for (const e of result.consoleErrors) console.log(`  - ${e.text}`);
    console.log(`Failed/error requests: ${result.networkErrors.length}`);
    for (const n of result.networkErrors) console.log(`  - [${n.status || "failed"}] ${n.method} ${n.url}`);
    if (result.navigationError) console.error(`Navigation error: ${result.navigationError}`);
    if (result.screenshotPath) console.log(`Screenshot: ${result.screenshotPath}`);

    const summary = JSON.stringify(
      {
        finalUrl: result.finalUrl,
        httpStatus: result.httpStatus,
        title: result.title,
        consoleErrors: result.consoleErrors,
        networkErrors: result.networkErrors,
        navigationError: result.navigationError,
      },
      null,
      2
    );

    const failed = Boolean(result.navigationError) || (result.httpStatus !== null && result.httpStatus >= 400);

    await submitCommandAudit(session.apiUrl, session.sessionToken, session.projectId, {
      command: `browser-check ${url}`,
      reason: opts.reason,
      risk: "read",
      category: "browser-navigation",
      decision: "auto_allow",
      permissionMode: "auto_safe",
      approved: true,
      exitCode: failed ? 1 : 0,
      durationMs,
      outputHash: hashOutput(summary, ""),
      stdoutPreview: previewOutput(summary),
      stderrPreview: result.navigationError ? previewOutput(result.navigationError) : "",
    }).catch((err) => console.error(`(failed to record audit entry: ${err.message})`));

    process.exitCode = failed ? 1 : 0;
  });

program
  .command("api-check <baseUrl>")
  .description("Discover an OpenAPI spec (if any) and probe endpoints with real HTTP requests")
  .option("--reason <reason>", "Why this check is being run", "Manual API check via ai-qa-agent CLI")
  .option("--max-endpoints <n>", "Cap on how many discovered endpoints to probe", "20")
  .action(async (baseUrl: string, opts: { reason: string; maxEndpoints: string }) => {
    const session = requireSession();
    const start = Date.now();

    console.log(`\nProbing ${baseUrl} ...`);
    const rootCheck = await probeEndpoint("GET", baseUrl);
    console.log(`GET / -> ${rootCheck.status ?? "failed"} (${rootCheck.durationMs}ms)`);

    const securityHeaders = checkSecurityHeaders(rootCheck.headers);
    for (const h of securityHeaders) {
      console.log(`  ${h.present ? "✓" : "✗"} ${h.header}`);
    }

    console.log("\nLooking for an OpenAPI/Swagger spec...");
    const spec = await discoverOpenApiSpec(baseUrl);
    const endpointChecks = [rootCheck];

    if (spec) {
      console.log(`Found spec at ${spec.specUrl} — ${spec.paths.length} path(s)`);
      const maxEndpoints = Number(opts.maxEndpoints) || 20;
      for (const path of spec.paths.slice(0, maxEndpoints)) {
        if (path.includes("{")) continue; // skip templated paths — no real param values to fill in
        const url = `${baseUrl.replace(/\/$/, "")}${path}`;
        const check = await probeEndpoint("GET", url);
        endpointChecks.push(check);
        console.log(`GET ${path} -> ${check.status ?? "failed"} (${check.durationMs}ms)`);
      }
    } else {
      console.log("No spec found at any well-known location.");
    }

    const durationMs = Date.now() - start;
    const failures = endpointChecks.filter((c) => !c.ok);
    const summary = JSON.stringify(
      { baseUrl, specUrl: spec?.specUrl ?? null, securityHeaders, endpointChecks },
      null,
      2
    );

    await submitCommandAudit(session.apiUrl, session.sessionToken, session.projectId, {
      command: `api-check ${baseUrl}`,
      reason: opts.reason,
      risk: "read",
      category: "api-check",
      decision: "auto_allow",
      permissionMode: "auto_safe",
      approved: true,
      exitCode: failures.length > 0 ? 1 : 0,
      durationMs,
      outputHash: hashOutput(summary, ""),
      stdoutPreview: previewOutput(summary),
      stderrPreview: "",
    }).catch((err) => console.error(`(failed to record audit entry: ${err.message})`));

    console.log(`\n${endpointChecks.length - failures.length}/${endpointChecks.length} endpoints OK`);
    process.exitCode = failures.length > 0 ? 1 : 0;
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
