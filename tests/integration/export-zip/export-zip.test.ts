import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { exportProjectZip } from "../../../agents/local-agent/src/export-zip.ts";

// Real filesystem I/O against the real fixture projects — no mocking. Mirrors
// the manual verification performed for Phase 9 T9.3, kept here as a
// permanent regression test.

const here = dirname(fileURLToPath(import.meta.url));
const OUT_ROOT = resolve(here, "../../../.ai-qa-test-tmp/export-zip");

afterAll(async () => {
  await rm(OUT_ROOT, { recursive: true, force: true });
});

describe("exportProjectZip", () => {
  it("refuses to export a project with a real planted secret", async () => {
    const cwd = resolve(here, "../../../fixtures/sample-projects/security-app");
    const result = await exportProjectZip(cwd, join(OUT_ROOT, "security-app"));
    expect(result.ok).toBe(false);
    expect(result.secretFindings?.length).toBeGreaterThan(0);
    expect(result.zipPath).toBeUndefined();
  });

  it("produces a real, integrity-checked zip for a clean project", async () => {
    const cwd = resolve(here, "../../../fixtures/sample-projects/node-api");
    const outDir = join(OUT_ROOT, "node-api");
    const result = await exportProjectZip(cwd, outDir);
    expect(result.ok).toBe(true);
    if (!result.ok || !result.zipPath || !result.checksumPath) throw new Error("expected a successful export");

    const zipBytes = await readFile(result.zipPath);
    // Real PK zip magic bytes — proves this is an actual zip file, not a stub.
    expect(zipBytes[0]).toBe(0x50);
    expect(zipBytes[1]).toBe(0x4b);
    expect(zipBytes.length).toBeGreaterThan(100);

    const checksumFile = await readFile(result.checksumPath, "utf8");
    const recordedHash = checksumFile.trim().split(/\s+/)[0];
    const actualHash = createHash("sha256").update(zipBytes).digest("hex");
    expect(recordedHash).toBe(actualHash);

    expect(result.fileCount).toBeGreaterThan(0);
  });

  it("excludes a .pem key file even though the secret scanner itself doesn't flag it (defense in depth)", async () => {
    // scanForSecurityFindings only special-cases .env files by name; a .pem
    // file isn't covered by that check, so this proves export-zip's own
    // isSensitivePath filter is doing real, independent work — not just
    // relying on the scan gate to catch everything.
    const cwd = join(OUT_ROOT, "pem-fixture");
    await mkdir(cwd, { recursive: true });
    await writeFile(join(cwd, "index.js"), "console.log('hello');\n", "utf8");
    await writeFile(join(cwd, "server.pem"), "-----BEGIN CERTIFICATE-----\nfake\n-----END CERTIFICATE-----\n", "utf8");

    const result = await exportProjectZip(cwd, join(OUT_ROOT, "pem-fixture-out"));
    expect(result.ok).toBe(true);
    // Only index.js + the generated README should be in the zip — the .pem excluded.
    expect(result.fileCount).toBe(2);
  });
});
