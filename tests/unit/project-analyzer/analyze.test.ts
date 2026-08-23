import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { analyzeProject, createLocalFileProvider } from "@ai-qa-agent/project-analyzer";

const FIXTURES = resolve(__dirname, "../../../fixtures/sample-projects");

describe("analyzeProject against fixtures/sample-projects/next-app", () => {
  it("detects the full real signal set from real files on disk", async () => {
    const provider = createLocalFileProvider(resolve(FIXTURES, "next-app"));
    const result = await analyzeProject(provider);

    expect(result.languages).toContain("TypeScript");
    expect(result.frameworks).toContain("Next.js");
    expect(result.packageManager).toBe("pnpm");
    expect(result.testFrameworks).toContain("Vitest");
    expect(result.orms).toContain("Prisma");
    expect(result.authProviders).toContain("NextAuth");
    expect(result.linting).toContain("ESLint");
    expect(result.deployment).toContain("Vercel");
    expect(result.cicd).toContain("GitHub Actions");
    expect(result.observability).toContain("Sentry");
  });

  it("does not claim signals that aren't present", async () => {
    const provider = createLocalFileProvider(resolve(FIXTURES, "next-app"));
    const result = await analyzeProject(provider);

    expect(result.frameworks).not.toContain("Express");
    expect(result.testFrameworks).not.toContain("Cypress");
    expect(result.databases).toEqual([]);
  });
});

describe("analyzeProject against fixtures/sample-projects/node-api", () => {
  it("detects an Express/Mongoose/Jest stack from real files on disk", async () => {
    const provider = createLocalFileProvider(resolve(FIXTURES, "node-api"));
    const result = await analyzeProject(provider);

    expect(result.frameworks).toContain("Express");
    expect(result.packageManager).toBe("npm");
    expect(result.testFrameworks).toEqual(expect.arrayContaining(["Jest", "Supertest"]));
    expect(result.orms).toContain("Mongoose");
    expect(result.authProviders).toContain("JWT");
    expect(result.deployment).toContain("Docker");
  });

  it("does not detect Next.js/TypeScript for a plain JS project", async () => {
    const provider = createLocalFileProvider(resolve(FIXTURES, "node-api"));
    const result = await analyzeProject(provider);

    expect(result.frameworks).not.toContain("Next.js");
    expect(result.languages).not.toContain("TypeScript");
  });
});

describe("analyzeProject against a non-existent directory", () => {
  it("returns an empty analysis instead of throwing", async () => {
    const provider = createLocalFileProvider(resolve(FIXTURES, "does-not-exist"));
    const result = await analyzeProject(provider);
    expect(result.frameworks).toEqual([]);
    expect(result.signals).toEqual([]);
  });
});
