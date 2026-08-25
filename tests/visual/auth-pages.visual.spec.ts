import { expect, test } from "@playwright/test";

// Real screenshots of real pages, compared against committed baseline PNGs —
// a genuine pixel diff, never a simulated pass. Scoped to the two stable,
// auth-free pages (login/signup) since anything behind Firebase Auth carries
// per-run dynamic state (uid, timestamps) that would make screenshots flaky
// for reasons that have nothing to do with a real visual regression.
//
// `nextjs-portal` is Next.js's own dev-mode build indicator overlay — it has
// nothing to do with this app's UI and its content is genuinely
// nondeterministic (build status), so it's masked out rather than diffed.
const DEV_OVERLAY = "nextjs-portal";

test("login page renders consistently", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Log in to AI QA Agent" })).toBeVisible();
  await expect(page).toHaveScreenshot("login.png", { mask: [page.locator(DEV_OVERLAY)] });
});

test("signup page renders consistently", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Create your AI QA Agent account" })).toBeVisible();
  await expect(page).toHaveScreenshot("signup.png", { mask: [page.locator(DEV_OVERLAY)] });
});
