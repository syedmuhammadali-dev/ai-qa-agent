import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import type { AccessibilityCheckResult } from "./types.ts";

/** Runs the real axe-core engine against a real page. Every violation reported
 * here is exactly what axe-core found — nothing summarized or invented. */
export async function runAccessibilityCheck(url: string): Promise<AccessibilityCheckResult> {
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
    return { url, navigationError, violations: [], passes: 0, incomplete: 0 };
  }

  const results = await new AxeBuilder({ page }).analyze();
  await browser.close();

  return {
    url,
    navigationError: null,
    violations: results.violations.map((v) => ({
      id: v.id,
      impact: v.impact ?? "unknown",
      description: v.description,
      help: v.help,
      helpUrl: v.helpUrl,
      nodeCount: v.nodes.length,
      targets: v.nodes.slice(0, 5).map((n) => n.target.join(" ")),
    })),
    passes: results.passes.length,
    incomplete: results.incomplete.length,
  };
}
