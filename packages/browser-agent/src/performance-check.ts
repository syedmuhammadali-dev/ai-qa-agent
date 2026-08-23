import { chromium } from "playwright";
import type { PerformanceCheckResult } from "./types.ts";

/** Real browser Navigation Timing / Resource Timing metrics — not a Lighthouse
 * score. Every number here comes from the actual page load that just happened. */
export async function runPerformanceCheck(url: string): Promise<PerformanceCheckResult> {
  const browser = await chromium.launch();
  const page = await browser.newContext().then((ctx) => ctx.newPage());

  let navigationError: string | null = null;
  try {
    await page.goto(url, { waitUntil: "load", timeout: 30000 });
  } catch (err) {
    navigationError = err instanceof Error ? err.message : String(err);
  }

  if (navigationError) {
    await browser.close();
    return {
      url,
      navigationError,
      ttfbMs: null,
      domContentLoadedMs: null,
      loadMs: null,
      resourceCount: 0,
      transferSizeBytes: 0,
    };
  }

  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    return {
      ttfbMs: nav ? nav.responseStart - nav.requestStart : null,
      domContentLoadedMs: nav ? nav.domContentLoadedEventEnd - nav.startTime : null,
      loadMs: nav ? nav.loadEventEnd - nav.startTime : null,
      resourceCount: resources.length,
      transferSizeBytes: resources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
    };
  });

  await browser.close();

  return { url, navigationError: null, ...metrics };
}
