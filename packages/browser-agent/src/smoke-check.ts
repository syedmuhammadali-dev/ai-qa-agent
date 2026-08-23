import { join } from "node:path";
import { chromium } from "playwright";
import type { ConsoleIssue, NetworkIssue, SmokeCheckResult } from "./types.ts";

/**
 * Navigates to a URL with a real browser and reports what actually happened —
 * HTTP status, console errors, failed/4xx-5xx network requests, and a
 * screenshot. Never fabricates a result: navigation failures are captured,
 * not swallowed.
 */
export async function runSmokeCheck(url: string, screenshotDir?: string): Promise<SmokeCheckResult> {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors: ConsoleIssue[] = [];
  const networkErrors: NetworkIssue[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push({ type: msg.type(), text: msg.text() });
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      networkErrors.push({ url: response.url(), status: response.status(), method: response.request().method() });
    }
  });
  page.on("requestfailed", (request) => {
    networkErrors.push({ url: request.url(), status: 0, method: request.method() });
  });

  const start = Date.now();
  let httpStatus: number | null = null;
  let navigationError: string | null = null;
  try {
    const response = await page.goto(url, { waitUntil: "load", timeout: 30000 });
    httpStatus = response?.status() ?? null;
  } catch (err) {
    navigationError = err instanceof Error ? err.message : String(err);
  }
  const loadTimeMs = Date.now() - start;

  const title = await page.title().catch(() => "");
  const finalUrl = page.url();

  let screenshotPath: string | null = null;
  if (screenshotDir) {
    const candidate = join(screenshotDir, `smoke-check-${Date.now()}.png`);
    const ok = await page
      .screenshot({ path: candidate, fullPage: true })
      .then(() => true)
      .catch(() => false);
    screenshotPath = ok ? candidate : null;
  }

  await browser.close();

  return {
    url,
    finalUrl,
    title,
    httpStatus,
    loadTimeMs,
    consoleErrors,
    networkErrors,
    screenshotPath,
    navigationError,
  };
}
