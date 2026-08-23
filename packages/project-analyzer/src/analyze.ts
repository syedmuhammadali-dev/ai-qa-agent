import { DEPENDENCY_SIGNALS, DEPLOYMENT_FILES, LOCKFILE_PACKAGE_MANAGERS } from "./signals.ts";
import type { DetectionSignal, FileProvider, ProjectAnalysis } from "./types.ts";

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export async function analyzeProject(provider: FileProvider): Promise<ProjectAnalysis> {
  const files = await provider.listFiles();
  const fileSet = new Set(files);
  const signals: DetectionSignal[] = [];
  const languages: string[] = [];

  const packageJsonPath = files.find((f) => f === "package.json");
  if (packageJsonPath) {
    languages.push("JavaScript/TypeScript");
    const raw = await provider.readFile(packageJsonPath);
    if (raw) {
      const pkg = safeParseJson(raw);
      const deps: Record<string, string> = { ...pkg?.dependencies, ...pkg?.devDependencies };
      for (const [depName, depSignal] of Object.entries(DEPENDENCY_SIGNALS)) {
        if (depName in deps) {
          signals.push({
            category: depSignal.category,
            name: depSignal.name,
            evidence: `package.json dependency: ${depName}`,
          });
        }
      }
      if (fileSet.has("tsconfig.json")) {
        languages.push("TypeScript");
      }
    }
  }

  if (files.some((f) => f === "requirements.txt" || f === "pyproject.toml")) {
    languages.push("Python");
    const req = fileSet.has("requirements.txt") ? await provider.readFile("requirements.txt") : null;
    if (req?.toLowerCase().includes("django")) {
      signals.push({ category: "framework", name: "Django", evidence: "requirements.txt" });
    }
    if (req?.toLowerCase().includes("flask")) {
      signals.push({ category: "framework", name: "Flask", evidence: "requirements.txt" });
    }
  }

  for (const [lockfile, manager] of Object.entries(LOCKFILE_PACKAGE_MANAGERS)) {
    if (fileSet.has(lockfile)) {
      signals.push({ category: "packageManager", name: manager, evidence: lockfile });
      break;
    }
  }

  for (const [file, name] of Object.entries(DEPLOYMENT_FILES)) {
    if (fileSet.has(file)) {
      signals.push({ category: "deployment", name, evidence: file });
    }
  }

  if (files.some((f) => f.startsWith(".github/workflows/"))) {
    signals.push({ category: "cicd", name: "GitHub Actions", evidence: ".github/workflows/" });
  }

  if (files.some((f) => f.endsWith("schema.prisma"))) {
    signals.push({ category: "orm", name: "Prisma", evidence: "schema.prisma" });
  }
  if (files.some((f) => f === "playwright.config.ts" || f === "playwright.config.js")) {
    signals.push({ category: "testFramework", name: "Playwright", evidence: "playwright.config" });
  }
  if (files.some((f) => f === "vitest.config.ts" || f === "vitest.config.js")) {
    signals.push({ category: "testFramework", name: "Vitest", evidence: "vitest.config" });
  }
  if (files.some((f) => f === "jest.config.ts" || f === "jest.config.js" || f === "jest.config.json")) {
    signals.push({ category: "testFramework", name: "Jest", evidence: "jest.config" });
  }
  if (files.some((f) => f === "cypress.config.ts" || f === "cypress.config.js")) {
    signals.push({ category: "testFramework", name: "Cypress", evidence: "cypress.config" });
  }

  const byCategory = (category: string) =>
    unique(signals.filter((s) => s.category === category).map((s) => s.name));

  return {
    languages: unique(languages),
    frameworks: byCategory("framework"),
    packageManager: byCategory("packageManager")[0] ?? null,
    testFrameworks: byCategory("testFramework"),
    databases: byCategory("database"),
    orms: byCategory("orm"),
    authProviders: byCategory("auth"),
    linting: byCategory("linting"),
    deployment: byCategory("deployment"),
    cicd: byCategory("cicd"),
    observability: byCategory("observability"),
    signals,
  };
}

function safeParseJson(raw: string): { dependencies?: Record<string, string>; devDependencies?: Record<string, string> } | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
