#!/usr/bin/env node
import { Command } from "commander";
import { analyzeProject, createLocalFileProvider } from "@ai-qa-agent/project-analyzer";
import { planTestCommand } from "@ai-qa-agent/qa-engine";
import { runAccessibilityCheck, runPerformanceCheck, runSmokeCheck } from "@ai-qa-agent/browser-agent";
import { checkSecurityHeaders, discoverOpenApiSpec, probeEndpoint } from "@ai-qa-agent/api-tester";
import { analyzeArchitecture } from "@ai-qa-agent/code-analyzer";
import { scanForSecurityFindings } from "@ai-qa-agent/security-engine";
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
  .command("a11y-check <url>")
  .description("Run the real axe-core accessibility engine against a URL")
  .option("--reason <reason>", "Why this check is being run", "Manual accessibility check via ai-qa-agent CLI")
  .action(async (url: string, opts: { reason: string }) => {
    const session = requireSession();
    console.log(`\nRunning axe-core against ${url} ...`);
    const start = Date.now();
    const result = await runAccessibilityCheck(url);
    const durationMs = Date.now() - start;

    if (result.navigationError) {
      console.error(`Navigation error: ${result.navigationError}`);
    } else {
      console.log(`Violations: ${result.violations.length} (${result.passes} checks passed)`);
      for (const v of result.violations) {
        console.log(`  [${v.impact}] ${v.id}: ${v.help} (${v.nodeCount} element(s))`);
      }
    }

    const summary = JSON.stringify(result, null, 2);
    const failed = Boolean(result.navigationError) || result.violations.length > 0;
    await submitCommandAudit(session.apiUrl, session.sessionToken, session.projectId, {
      command: `a11y-check ${url}`,
      reason: opts.reason,
      risk: "read",
      category: "accessibility-check",
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
  .command("perf-check <url>")
  .description("Real browser Navigation/Resource Timing metrics for a URL (not a Lighthouse score)")
  .option("--reason <reason>", "Why this check is being run", "Manual performance check via ai-qa-agent CLI")
  .action(async (url: string, opts: { reason: string }) => {
    const session = requireSession();
    console.log(`\nMeasuring ${url} ...`);
    const start = Date.now();
    const result = await runPerformanceCheck(url);
    const durationMs = Date.now() - start;

    if (result.navigationError) {
      console.error(`Navigation error: ${result.navigationError}`);
    } else {
      console.log(`TTFB: ${result.ttfbMs?.toFixed(0)}ms`);
      console.log(`DOMContentLoaded: ${result.domContentLoadedMs?.toFixed(0)}ms`);
      console.log(`Load: ${result.loadMs?.toFixed(0)}ms`);
      console.log(`Resources: ${result.resourceCount} (${(result.transferSizeBytes / 1024).toFixed(1)} KB transferred)`);
    }

    const summary = JSON.stringify(result, null, 2);
    await submitCommandAudit(session.apiUrl, session.sessionToken, session.projectId, {
      command: `perf-check ${url}`,
      reason: opts.reason,
      risk: "read",
      category: "performance-check",
      decision: "auto_allow",
      permissionMode: "auto_safe",
      approved: true,
      exitCode: result.navigationError ? 1 : 0,
      durationMs,
      outputHash: hashOutput(summary, ""),
      stdoutPreview: previewOutput(summary),
      stderrPreview: result.navigationError ? previewOutput(result.navigationError) : "",
    }).catch((err) => console.error(`(failed to record audit entry: ${err.message})`));

    process.exitCode = result.navigationError ? 1 : 0;
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

program
  .command("architecture")
  .description("Analyze real import structure: circular dependencies, oversized files, coupling")
  .option("--reason <reason>", "Why this check is being run", "Manual architecture check via ai-qa-agent CLI")
  .option("--cwd <dir>", "Project directory", process.cwd())
  .action(async (opts: { reason: string; cwd: string }) => {
    const session = requireSession();
    const start = Date.now();
    const provider = createLocalFileProvider(opts.cwd);

    console.log("\nScanning import graph...");
    const result = await analyzeArchitecture(provider);
    const durationMs = Date.now() - start;

    console.log(`Files analyzed: ${result.fileCount}`);
    console.log(`Circular dependencies: ${result.circularDependencies.length}`);
    for (const c of result.circularDependencies) console.log(`  - ${c.cycle.join(" -> ")}`);
    console.log(`Oversized files: ${result.oversizedFiles.length}`);
    for (const f of result.oversizedFiles.slice(0, 10)) console.log(`  - ${f.path} (${f.lines} lines)`);

    const summary = JSON.stringify(result, null, 2);
    await submitCommandAudit(session.apiUrl, session.sessionToken, session.projectId, {
      command: `architecture --cwd ${opts.cwd}`,
      reason: opts.reason,
      risk: "read",
      category: "architecture",
      decision: "auto_allow",
      permissionMode: "auto_safe",
      approved: true,
      exitCode: 0,
      durationMs,
      outputHash: hashOutput(summary, ""),
      stdoutPreview: previewOutput(summary),
      stderrPreview: "",
    }).catch((err) => console.error(`(failed to record audit entry: ${err.message})`));

    console.log(`\n${result.findings.length} finding(s).`);
  });

program
  .command("security-scan")
  .description("Static secret/injection/XSS/CORS scan of real source files, plus a real dependency audit")
  .option("--reason <reason>", "Why this scan is being run", "Manual security scan via ai-qa-agent CLI")
  .option("--cwd <dir>", "Project directory", process.cwd())
  .option("--skip-audit", "Skip running the package manager's dependency audit", false)
  .action(async (opts: { reason: string; cwd: string; skipAudit: boolean }) => {
    const session = requireSession();
    const start = Date.now();
    const provider = createLocalFileProvider(opts.cwd);

    console.log("\nScanning source files...");
    const result = await scanForSecurityFindings(provider);
    console.log(`Files scanned: ${result.filesScanned}`);
    console.log(`Findings: ${result.findings.length}`);
    for (const f of result.findings) {
      console.log(`  [${f.severity}] ${f.problem} (${f.evidence})`);
    }
    const durationMs = Date.now() - start;

    const summary = JSON.stringify(result, null, 2);
    await submitCommandAudit(session.apiUrl, session.sessionToken, session.projectId, {
      command: `security-scan --cwd ${opts.cwd}`,
      reason: opts.reason,
      risk: "read",
      category: "security-scan",
      decision: "auto_allow",
      permissionMode: "auto_safe",
      approved: true,
      exitCode: result.findings.some((f) => f.severity === "critical" || f.severity === "high") ? 1 : 0,
      durationMs,
      outputHash: hashOutput(summary, ""),
      stdoutPreview: previewOutput(summary),
      stderrPreview: "",
    }).catch((err) => console.error(`(failed to record audit entry: ${err.message})`));

    if (!opts.skipAudit) {
      const analysis = await analyzeProject(provider);
      const pm = analysis.packageManager ?? "npm";
      console.log(`\nRunning real dependency audit (${pm} audit)...`);
      const exitCode = await runCommandThroughPolicy(session, `${pm} audit`, "Dependency vulnerability audit", opts.cwd);
      process.exitCode = exitCode;
      return;
    }

    process.exitCode = result.findings.some((f) => f.severity === "critical" || f.severity === "high") ? 1 : 0;
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
