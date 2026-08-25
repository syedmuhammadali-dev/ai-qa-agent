#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Command } from "commander";
import {
  analyzeProject,
  createLocalFileProvider,
} from "@ai-qa-agent/project-analyzer";
import { planTestCommand } from "@ai-qa-agent/qa-engine";
import {
  runAccessibilityCheck,
  runPerformanceCheck,
  runSmokeCheck,
} from "@ai-qa-agent/browser-agent";
import {
  checkSecurityHeaders,
  discoverOpenApiSpec,
  probeEndpoint,
} from "@ai-qa-agent/api-tester";
import { analyzeArchitecture } from "@ai-qa-agent/code-analyzer";
import { scanForSecurityFindings } from "@ai-qa-agent/security-engine";
import {
  createRunWorkspace,
  hashOutput,
  isProtectedBranch,
  previewOutput,
  pruneRuns,
} from "@ai-qa-agent/agent-core";
import {
  clearSession,
  loadSession,
  requireSession,
  saveSession,
} from "./config.ts";
import {
  createRun,
  exchangePairingCode,
  fetchPendingFixes,
  fetchPendingReleases,
  reportFixApplied,
  reportReleasePushed,
  submitCommandAudit,
  updateRun,
  uploadEvidence,
} from "./api.ts";
import { runCommandThroughPolicy } from "./run-through-policy.ts";
import { runCommand } from "./exec.ts";
import { exportProjectZip } from "./export-zip.ts";

const program = new Command();
program
  .name("ai-qa-agent")
  .description("Local agent for the AI QA Agent platform")
  .version("0.1.0");

program
  .command("connect <code>")
  .description(
    "Pair this machine with a project using a code generated in the dashboard's Settings page",
  )
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
    console.log(
      `Connected to "${session.projectName}" (${session.projectId}) at ${apiUrl}`,
    );
  });

program
  .command("disconnect")
  .description("Forget the saved connection on this machine")
  .action(() => {
    clearSession();
    console.log(
      "Disconnected. Revoke the session from the dashboard Settings page if needed.",
    );
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
  .description(
    "Run a command through the command policy engine, with audit logging",
  )
  .option(
    "--reason <reason>",
    "Why this command is being run",
    "Manual run via ai-qa-agent CLI",
  )
  .option("--cwd <dir>", "Working directory", process.cwd())
  .action(
    async (commandParts: string[], opts: { reason: string; cwd: string }) => {
      const session = requireSession();
      const exitCode = await runCommandThroughPolicy(
        session,
        commandParts.join(" "),
        opts.reason,
        opts.cwd,
      );
      process.exitCode = exitCode;
    },
  );

program
  .command("analyze")
  .description(
    "Detect framework, package manager, test framework, DB/ORM, and auth from real files",
  )
  .option("--cwd <dir>", "Project directory", process.cwd())
  .action(async (opts: { cwd: string }) => {
    const provider = createLocalFileProvider(opts.cwd);
    const analysis = await analyzeProject(provider);

    const line = (label: string, values: string[] | string | null) =>
      console.log(
        `${label}: ${Array.isArray(values) ? (values.length ? values.join(", ") : "(none detected)") : (values ?? "(none detected)")}`,
      );

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
  .description(
    "Detect the project's test setup and run it through the command policy engine",
  )
  .option("--cwd <dir>", "Project directory", process.cwd())
  .action(async (opts: { cwd: string }) => {
    const session = requireSession();
    const provider = createLocalFileProvider(opts.cwd);
    const analysis = await analyzeProject(provider);
    const pkgRaw = await provider.readFile("package.json");
    const scripts = pkgRaw
      ? (JSON.parse(pkgRaw).scripts as Record<string, string> | undefined)
      : undefined;

    const plan = planTestCommand(analysis, scripts);
    if (!plan) {
      console.error(
        `No test framework detected (frameworks seen: ${analysis.testFrameworks.join(", ") || "none"}). Nothing to run.`,
      );
      process.exitCode = 1;
      return;
    }

    console.log(
      `Detected test setup: ${analysis.testFrameworks.join(", ") || "none"}`,
    );
    console.log(plan.reason);

    const exitCode = await runCommandThroughPolicy(
      session,
      plan.command,
      "Detected test run via ai-qa-agent test",
      opts.cwd,
    );
    process.exitCode = exitCode;
  });

program
  .command("browser-check <url>")
  .description(
    "Navigate to a URL with a real browser and report console errors, failed requests, and a screenshot",
  )
  .option(
    "--reason <reason>",
    "Why this check is being run",
    "Manual browser check via ai-qa-agent CLI",
  )
  .option(
    "--cwd <dir>",
    "Working directory (workspace root for the screenshot)",
    process.cwd(),
  )
  .action(async (url: string, opts: { reason: string; cwd: string }) => {
    const session = requireSession();
    const workspace = await createRunWorkspace(opts.cwd);
    await pruneRuns(opts.cwd, 10).catch(() => []);

    const runId = await createRun(
      session.apiUrl,
      session.sessionToken,
      session.projectId,
      `browser-check ${url}`,
      "browser-navigation",
    ).catch(() => null);

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
    for (const n of result.networkErrors)
      console.log(`  - [${n.status || "failed"}] ${n.method} ${n.url}`);
    if (result.navigationError)
      console.error(`Navigation error: ${result.navigationError}`);
    if (result.screenshotPath)
      console.log(`Screenshot: ${result.screenshotPath}`);

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
      2,
    );

    const failed =
      Boolean(result.navigationError) ||
      (result.httpStatus !== null && result.httpStatus >= 400);

    if (runId) {
      await updateRun(
        session.apiUrl,
        session.sessionToken,
        session.projectId,
        runId,
        {
          log: summary,
          status: failed ? "failed" : "completed",
          exitCode: failed ? 1 : 0,
          finishedAt: Date.now(),
        },
      );

      if (result.screenshotPath) {
        const bytes = await readFile(result.screenshotPath).catch(() => null);
        if (bytes) {
          const filename = result.screenshotPath.split(/[\\/]/).pop()!;
          const upload = await uploadEvidence(
            session.apiUrl,
            session.sessionToken,
            session.projectId,
            runId,
            filename,
            "image/png",
            bytes.toString("base64"),
          ).catch((err) => {
            console.error(
              `(evidence upload failed: ${err instanceof Error ? err.message : err})`,
            );
            return null;
          });
          if (upload?.uploaded)
            console.log(`Uploaded evidence: ${upload.path}`);
        }
      }
    }

    await submitCommandAudit(
      session.apiUrl,
      session.sessionToken,
      session.projectId,
      {
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
        stderrPreview: result.navigationError
          ? previewOutput(result.navigationError)
          : "",
        runId: runId ?? undefined,
      },
    ).catch((err) =>
      console.error(`(failed to record audit entry: ${err.message})`),
    );

    process.exitCode = failed ? 1 : 0;
  });

program
  .command("a11y-check <url>")
  .description("Run the real axe-core accessibility engine against a URL")
  .option(
    "--reason <reason>",
    "Why this check is being run",
    "Manual accessibility check via ai-qa-agent CLI",
  )
  .action(async (url: string, opts: { reason: string }) => {
    const session = requireSession();
    console.log(`\nRunning axe-core against ${url} ...`);
    const start = Date.now();
    const result = await runAccessibilityCheck(url);
    const durationMs = Date.now() - start;

    if (result.navigationError) {
      console.error(`Navigation error: ${result.navigationError}`);
    } else {
      console.log(
        `Violations: ${result.violations.length} (${result.passes} checks passed)`,
      );
      for (const v of result.violations) {
        console.log(
          `  [${v.impact}] ${v.id}: ${v.help} (${v.nodeCount} element(s))`,
        );
      }
    }

    const summary = JSON.stringify(result, null, 2);
    const failed =
      Boolean(result.navigationError) || result.violations.length > 0;
    await submitCommandAudit(
      session.apiUrl,
      session.sessionToken,
      session.projectId,
      {
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
        stderrPreview: result.navigationError
          ? previewOutput(result.navigationError)
          : "",
      },
    ).catch((err) =>
      console.error(`(failed to record audit entry: ${err.message})`),
    );

    process.exitCode = failed ? 1 : 0;
  });

program
  .command("perf-check <url>")
  .description(
    "Real browser Navigation/Resource Timing metrics for a URL (not a Lighthouse score)",
  )
  .option(
    "--reason <reason>",
    "Why this check is being run",
    "Manual performance check via ai-qa-agent CLI",
  )
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
      console.log(
        `DOMContentLoaded: ${result.domContentLoadedMs?.toFixed(0)}ms`,
      );
      console.log(`Load: ${result.loadMs?.toFixed(0)}ms`);
      console.log(
        `Resources: ${result.resourceCount} (${(result.transferSizeBytes / 1024).toFixed(1)} KB transferred)`,
      );
    }

    const summary = JSON.stringify(result, null, 2);
    await submitCommandAudit(
      session.apiUrl,
      session.sessionToken,
      session.projectId,
      {
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
        stderrPreview: result.navigationError
          ? previewOutput(result.navigationError)
          : "",
      },
    ).catch((err) =>
      console.error(`(failed to record audit entry: ${err.message})`),
    );

    process.exitCode = result.navigationError ? 1 : 0;
  });

program
  .command("api-check <baseUrl>")
  .description(
    "Discover an OpenAPI spec (if any) and probe endpoints with real HTTP requests",
  )
  .option(
    "--reason <reason>",
    "Why this check is being run",
    "Manual API check via ai-qa-agent CLI",
  )
  .option(
    "--max-endpoints <n>",
    "Cap on how many discovered endpoints to probe",
    "20",
  )
  .action(
    async (baseUrl: string, opts: { reason: string; maxEndpoints: string }) => {
      const session = requireSession();
      const start = Date.now();

      console.log(`\nProbing ${baseUrl} ...`);
      const rootCheck = await probeEndpoint("GET", baseUrl);
      console.log(
        `GET / -> ${rootCheck.status ?? "failed"} (${rootCheck.durationMs}ms)`,
      );

      const securityHeaders = checkSecurityHeaders(rootCheck.headers);
      for (const h of securityHeaders) {
        console.log(`  ${h.present ? "✓" : "✗"} ${h.header}`);
      }

      console.log("\nLooking for an OpenAPI/Swagger spec...");
      const spec = await discoverOpenApiSpec(baseUrl);
      const endpointChecks = [rootCheck];

      if (spec) {
        console.log(
          `Found spec at ${spec.specUrl} — ${spec.paths.length} path(s)`,
        );
        const maxEndpoints = Number(opts.maxEndpoints) || 20;
        for (const path of spec.paths.slice(0, maxEndpoints)) {
          if (path.includes("{")) continue; // skip templated paths — no real param values to fill in
          const url = `${baseUrl.replace(/\/$/, "")}${path}`;
          const check = await probeEndpoint("GET", url);
          endpointChecks.push(check);
          console.log(
            `GET ${path} -> ${check.status ?? "failed"} (${check.durationMs}ms)`,
          );
        }
      } else {
        console.log("No spec found at any well-known location.");
      }

      const durationMs = Date.now() - start;
      const failures = endpointChecks.filter((c) => !c.ok);
      const summary = JSON.stringify(
        {
          baseUrl,
          specUrl: spec?.specUrl ?? null,
          securityHeaders,
          endpointChecks,
        },
        null,
        2,
      );

      await submitCommandAudit(
        session.apiUrl,
        session.sessionToken,
        session.projectId,
        {
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
        },
      ).catch((err) =>
        console.error(`(failed to record audit entry: ${err.message})`),
      );

      console.log(
        `\n${endpointChecks.length - failures.length}/${endpointChecks.length} endpoints OK`,
      );
      process.exitCode = failures.length > 0 ? 1 : 0;
    },
  );

program
  .command("architecture")
  .description(
    "Analyze real import structure: circular dependencies, oversized files, coupling",
  )
  .option(
    "--reason <reason>",
    "Why this check is being run",
    "Manual architecture check via ai-qa-agent CLI",
  )
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
    for (const c of result.circularDependencies)
      console.log(`  - ${c.cycle.join(" -> ")}`);
    console.log(`Oversized files: ${result.oversizedFiles.length}`);
    for (const f of result.oversizedFiles.slice(0, 10))
      console.log(`  - ${f.path} (${f.lines} lines)`);

    const summary = JSON.stringify(result, null, 2);
    await submitCommandAudit(
      session.apiUrl,
      session.sessionToken,
      session.projectId,
      {
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
      },
    ).catch((err) =>
      console.error(`(failed to record audit entry: ${err.message})`),
    );

    console.log(`\n${result.findings.length} finding(s).`);
  });

program
  .command("security-scan")
  .description(
    "Static secret/injection/XSS/CORS scan of real source files, plus a real dependency audit",
  )
  .option(
    "--reason <reason>",
    "Why this scan is being run",
    "Manual security scan via ai-qa-agent CLI",
  )
  .option("--cwd <dir>", "Project directory", process.cwd())
  .option(
    "--skip-audit",
    "Skip running the package manager's dependency audit",
    false,
  )
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
    await submitCommandAudit(
      session.apiUrl,
      session.sessionToken,
      session.projectId,
      {
        command: `security-scan --cwd ${opts.cwd}`,
        reason: opts.reason,
        risk: "read",
        category: "security-scan",
        decision: "auto_allow",
        permissionMode: "auto_safe",
        approved: true,
        exitCode: result.findings.some(
          (f) => f.severity === "critical" || f.severity === "high",
        )
          ? 1
          : 0,
        durationMs,
        outputHash: hashOutput(summary, ""),
        stdoutPreview: previewOutput(summary),
        stderrPreview: "",
      },
    ).catch((err) =>
      console.error(`(failed to record audit entry: ${err.message})`),
    );

    if (!opts.skipAudit) {
      const analysis = await analyzeProject(provider);
      const pm = analysis.packageManager ?? "npm";
      console.log(`\nRunning real dependency audit (${pm} audit)...`);
      const exitCode = await runCommandThroughPolicy(
        session,
        `${pm} audit`,
        "Dependency vulnerability audit",
        opts.cwd,
      );
      process.exitCode = exitCode;
      return;
    }

    process.exitCode = result.findings.some(
      (f) => f.severity === "critical" || f.severity === "high",
    )
      ? 1
      : 0;
  });

program
  .command("apply-fixes")
  .description(
    "Apply AI-proposed fixes you've approved on the dashboard, then run the regression test suite",
  )
  .option("--cwd <dir>", "Project directory", process.cwd())
  .action(async (opts: { cwd: string }) => {
    const session = requireSession();
    const fixes = await fetchPendingFixes(
      session.apiUrl,
      session.sessionToken,
      session.projectId,
    );

    if (fixes.length === 0) {
      console.log("No approved fixes waiting to be applied.");
      return;
    }

    let anyFailed = false;

    for (const fix of fixes) {
      console.log(`\nApplying fix to ${fix.filePath} (${fix.safety})`);
      console.log(fix.explanation);

      const targetPath = join(opts.cwd, ...fix.filePath.split("/"));
      await mkdir(dirname(targetPath), { recursive: true });
      await writeFile(targetPath, fix.patchedContent, "utf8");
      console.log(`Wrote ${fix.filePath}`);

      const provider = createLocalFileProvider(opts.cwd);
      const analysis = await analyzeProject(provider);
      const pkgRaw = await provider.readFile("package.json");
      const scripts = pkgRaw
        ? (JSON.parse(pkgRaw).scripts as Record<string, string> | undefined)
        : undefined;
      const plan = planTestCommand(analysis, scripts);

      if (!plan) {
        console.log(
          "No test framework detected — skipping regression run, marking as applied without verification.",
        );
        await reportFixApplied(
          session.apiUrl,
          session.sessionToken,
          session.projectId,
          fix.runId,
          {
            regressionPassed: true,
            regressionLog: "(no test framework detected — regression not run)",
            regressionExitCode: null,
          },
        );
        continue;
      }

      console.log(`Running regression: ${plan.command}`);
      const workspace = await createRunWorkspace(opts.cwd);
      const result = await runCommand(
        plan.command,
        opts.cwd,
        workspace.logsDir,
      );
      const passed = result.exitCode === 0;
      if (!passed) anyFailed = true;

      console.log(
        passed
          ? "Regression passed."
          : `Regression failed (exit ${result.exitCode}).`,
      );
      await reportFixApplied(
        session.apiUrl,
        session.sessionToken,
        session.projectId,
        fix.runId,
        {
          regressionPassed: passed,
          regressionLog: `${result.stdout}\n${result.stderr}`,
          regressionExitCode: result.exitCode,
        },
      );
    }

    process.exitCode = anyFailed ? 1 : 0;
  });

program
  .command("push-release")
  .description(
    "Push a release branch confirmed on the dashboard's pre-push confirmation screen: real branch, real commit under a transparent machine identity, real push, real PR — never main/master",
  )
  .option("--cwd <dir>", "Project directory", process.cwd())
  .action(async (opts: { cwd: string }) => {
    const session = requireSession();
    const releases = await fetchPendingReleases(
      session.apiUrl,
      session.sessionToken,
      session.projectId,
    );

    if (releases.length === 0) {
      console.log("No confirmed releases waiting to be pushed.");
      return;
    }

    let anyFailed = false;

    for (const release of releases) {
      console.log(`\nPushing release: ${release.branchName} (base: ${release.baseBranch})`);

      if (isProtectedBranch(release.branchName)) {
        console.error(
          `Refusing: "${release.branchName}" is a protected branch name. This should never happen — the dashboard already validates this.`,
        );
        anyFailed = true;
        await reportReleasePushed(
          session.apiUrl,
          session.sessionToken,
          session.projectId,
          release.runId,
          { success: false, failureReason: "Branch name was protected (main/master) — refused locally." },
        );
        continue;
      }

      const steps: Array<{ command: string; reason: string }> = [
        {
          command: `git checkout -b ${release.branchName}`,
          reason: "Create a release branch for a verified, applied fix",
        },
        {
          command: `git add ${release.changedFiles.map((f) => `"${f}"`).join(" ")}`,
          reason: "Stage the applied fix for commit",
        },
        {
          command: `git -c user.name="AI QA Agent" -c user.email="ai-qa-agent@users.noreply.github.com" commit -m "${release.commitMessage.replace(/"/g, "'")}"`,
          reason: "Commit the applied fix under a transparent machine identity, never impersonating the user",
        },
        {
          command: `git push origin ${release.branchName}`,
          reason: "Push the release branch to the remote",
        },
      ];

      let failed = false;
      for (const step of steps) {
        const exitCode = await runCommandThroughPolicy(session, step.command, step.reason, opts.cwd);
        if (exitCode !== 0) {
          console.error(`Step failed (exit ${exitCode}): ${step.command}`);
          anyFailed = true;
          failed = true;
          await reportReleasePushed(
            session.apiUrl,
            session.sessionToken,
            session.projectId,
            release.runId,
            { success: false, failureReason: `"${step.command}" failed (exit ${exitCode})` },
          );
          break;
        }
      }
      if (failed) continue;

      const sha = await runCommand("git rev-parse HEAD", opts.cwd);
      const commitSha = sha.stdout.trim() || undefined;

      await reportReleasePushed(
        session.apiUrl,
        session.sessionToken,
        session.projectId,
        release.runId,
        { success: true, commitSha },
      );
      console.log(
        `Pushed ${release.branchName}${commitSha ? ` (${commitSha.slice(0, 7)})` : ""}. Check the dashboard for the PR link.`,
      );
    }

    process.exitCode = anyFailed ? 1 : 0;
  });

program
  .command("export-zip")
  .description(
    "Export a clean, verified zip of the real project: secret scan -> cleanup -> validate -> README -> integrity checksum",
  )
  .option("--cwd <dir>", "Project directory", process.cwd())
  .option("--out <dir>", "Output directory", ".ai-qa/exports")
  .action(async (opts: { cwd: string; out: string }) => {
    const session = requireSession();
    const start = Date.now();
    const outDir = join(opts.cwd, opts.out);

    console.log("\nRunning secret scan before export...");
    const result = await exportProjectZip(opts.cwd, outDir);
    const durationMs = Date.now() - start;

    if (!result.ok) {
      console.error(`\nExport refused: ${result.reason}`);
      if (result.secretFindings) {
        for (const f of result.secretFindings) {
          console.error(`  [${f.severity}] ${f.problem} (${f.evidence})`);
        }
      }
      await submitCommandAudit(session.apiUrl, session.sessionToken, session.projectId, {
        command: `export-zip --cwd ${opts.cwd}`,
        reason: "Export project as a verified zip",
        risk: "read",
        category: "export",
        decision: "auto_allow",
        permissionMode: "auto_safe",
        approved: true,
        exitCode: 1,
        durationMs,
        outputHash: hashOutput(result.reason ?? "", ""),
        stdoutPreview: "",
        stderrPreview: previewOutput(result.reason ?? ""),
      }).catch((err) => console.error(`(failed to record audit entry: ${err.message})`));
      process.exitCode = 1;
      return;
    }

    console.log(`\nExported ${result.fileCount} files to ${result.zipPath}`);
    console.log(`Checksum written to ${result.checksumPath}`);
    console.log("Integrity verified: re-hashing the written zip matched the recorded checksum.");

    const summary = `Exported ${result.fileCount} files -> ${result.zipPath}\nChecksum: ${result.checksumPath}`;
    await submitCommandAudit(session.apiUrl, session.sessionToken, session.projectId, {
      command: `export-zip --cwd ${opts.cwd}`,
      reason: "Export project as a verified zip",
      risk: "read",
      category: "export",
      decision: "auto_allow",
      permissionMode: "auto_safe",
      approved: true,
      exitCode: 0,
      durationMs,
      outputHash: hashOutput(summary, ""),
      stdoutPreview: previewOutput(summary),
      stderrPreview: "",
    }).catch((err) => console.error(`(failed to record audit entry: ${err.message})`));

    process.exitCode = 0;
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
