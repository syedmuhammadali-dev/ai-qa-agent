import { describe, expect, it } from "vitest";
import { planTestCommand } from "@ai-qa-agent/qa-engine";
import type { ProjectAnalysis } from "@ai-qa-agent/project-analyzer";

function analysis(overrides: Partial<ProjectAnalysis> = {}): ProjectAnalysis {
  return {
    languages: [],
    frameworks: [],
    packageManager: "npm",
    testFrameworks: [],
    databases: [],
    orms: [],
    authProviders: [],
    linting: [],
    deployment: [],
    cicd: [],
    observability: [],
    signals: [],
    ...overrides,
  };
}

describe("planTestCommand", () => {
  it("prefers the project's own package.json test script", () => {
    const plan = planTestCommand(analysis({ packageManager: "pnpm" }), { test: "vitest run" });
    expect(plan?.command).toBe("pnpm test");
  });

  it("does not treat npm's default placeholder script as a real test command", () => {
    const plan = planTestCommand(analysis({ testFrameworks: ["Jest"] }), {
      test: 'echo "Error: no test specified" && exit 1',
    });
    expect(plan?.command).toBe("npx jest");
  });

  it.each([
    ["Vitest", "npx vitest run"],
    ["Jest", "npx jest"],
    ["Playwright", "npx playwright test"],
    ["Cypress", "npx cypress run"],
    ["Mocha", "npx mocha"],
  ])("falls back to %s when there is no test script", (framework, expectedCommand) => {
    const plan = planTestCommand(analysis({ testFrameworks: [framework] }), null);
    expect(plan?.command).toBe(expectedCommand);
  });

  it("returns null when nothing is detected", () => {
    expect(planTestCommand(analysis(), null)).toBeNull();
    expect(planTestCommand(analysis(), {})).toBeNull();
  });

  it("uses the right package manager invocation for yarn/pnpm/bun", () => {
    expect(planTestCommand(analysis({ packageManager: "yarn" }), { test: "jest" })?.command).toBe("yarn test");
    expect(planTestCommand(analysis({ packageManager: "bun" }), { test: "jest" })?.command).toBe("bun test");
  });
});
