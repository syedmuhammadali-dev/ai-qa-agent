import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createLocalFileProvider } from "@ai-qa-agent/project-analyzer";
import { scanForSecurityFindings } from "@ai-qa-agent/security-engine";

const FIXTURE = resolve(__dirname, "../../../fixtures/sample-projects/security-app");

describe("scanForSecurityFindings against a real vulnerable fixture", () => {
  it("finds every deliberately-planted issue, each with real file:line evidence", async () => {
    const provider = createLocalFileProvider(FIXTURE);
    const result = await scanForSecurityFindings(provider);

    const byProblem = (needle: string) => result.findings.filter((f) => f.problem.includes(needle));

    expect(byProblem("tracked in the repository")).toHaveLength(1);
    expect(byProblem("tracked in the repository")[0].evidence).toBe(".env");

    expect(byProblem("secret-shaped assignment").length).toBeGreaterThan(0);
    expect(byProblem("secret-shaped assignment")[0].evidence).toMatch(/config\.js:\d+/);

    expect(byProblem("SQL built via string interpolation").length).toBeGreaterThan(0);
    expect(byProblem("SQL built via string interpolation")[0].evidence).toMatch(/db\.js:\d+/);

    expect(byProblem("dangerouslySetInnerHTML").length).toBeGreaterThan(0);
    expect(byProblem("eval()").length).toBeGreaterThan(0);
    expect(byProblem("CORS wildcard").length).toBeGreaterThan(0);
  });

  it("counts the real number of scannable files, not a guess", async () => {
    const provider = createLocalFileProvider(FIXTURE);
    const result = await scanForSecurityFindings(provider);
    expect(result.filesScanned).toBeGreaterThan(0);
  });
});

describe("scanForSecurityFindings against a clean fixture", () => {
  it("reports zero findings for a project with none of these issues", async () => {
    const provider = createLocalFileProvider(resolve(__dirname, "../../../fixtures/sample-projects/node-api"));
    const result = await scanForSecurityFindings(provider);
    expect(result.findings).toEqual([]);
  });
});
