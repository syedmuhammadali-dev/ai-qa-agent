import type { ProjectAnalysis } from "@ai-qa-agent/project-analyzer";

export interface TestCommandPlan {
  command: string;
  reason: string;
}

const RUNNER_TEST_COMMAND: Record<string, string> = {
  pnpm: "pnpm test",
  yarn: "yarn test",
  bun: "bun test",
  npm: "npm test",
};

const FRAMEWORK_FALLBACK_COMMAND: Array<{ framework: string; command: string }> = [
  { framework: "Vitest", command: "npx vitest run" },
  { framework: "Jest", command: "npx jest" },
  { framework: "Playwright", command: "npx playwright test" },
  { framework: "Cypress", command: "npx cypress run" },
  { framework: "Mocha", command: "npx mocha" },
];

/**
 * Decides what to run. Prefers the project's own `package.json` "test" script
 * (the project owner already chose how their tests run) and only falls back
 * to inferring a bare test-runner invocation from detected frameworks.
 */
export function planTestCommand(
  analysis: ProjectAnalysis,
  packageJsonScripts: Record<string, string> | null | undefined
): TestCommandPlan | null {
  const hasOwnTestScript =
    typeof packageJsonScripts?.test === "string" &&
    packageJsonScripts.test.trim().length > 0 &&
    !packageJsonScripts.test.includes("no test specified");

  if (hasOwnTestScript) {
    const runner = analysis.packageManager ?? "npm";
    return {
      command: RUNNER_TEST_COMMAND[runner] ?? RUNNER_TEST_COMMAND.npm,
      reason: 'Uses the project\'s existing package.json "test" script.',
    };
  }

  for (const { framework, command } of FRAMEWORK_FALLBACK_COMMAND) {
    if (analysis.testFrameworks.includes(framework)) {
      return { command, reason: `No "test" script found; ${framework} was detected directly.` };
    }
  }

  return null;
}
