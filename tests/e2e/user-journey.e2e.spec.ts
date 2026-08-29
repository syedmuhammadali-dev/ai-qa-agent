import { test, expect } from "@playwright/test";
import { initializeApp, cert, getApps, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Real signup -> login -> create project -> delete project, driven entirely
 * through the actual UI (not seeded via Admin SDK) against the real dev
 * server and real Firebase project. This is the automatable slice of the
 * full journey described in RemainingTasks.md T10.3:
 *
 *   signup -> login -> create project -> connect GitHub -> configure AI ->
 *   run audit -> view findings -> approve fix -> run regression ->
 *   create branch -> generate ZIP
 *
 * "connect GitHub" cannot be automated here: GitHub's OAuth consent screen
 * requires a human to click "Authorize" (the same limitation documented
 * across Phases 2/6/7/8's live verification). "Run audit" / "approve fix" /
 * "create branch" / "generate ZIP" all require the local agent CLI, which
 * is a separate real process outside a browser's control (by design — see
 * the "never run arbitrary user repos in a serverless runtime" rule).
 * Those steps are covered by this project's per-phase live E2E logs in
 * TASKS.md instead, using real fixture projects and a real local-agent
 * process. This spec covers exactly the part a browser actually can drive.
 */

let adminApp: App;

test.beforeAll(() => {
  try {
    process.loadEnvFile(".env");
  } catch {
    // Already loaded by the environment (e.g. CI secrets) — don't fail over this.
  }
  adminApp = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
          privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, "\n"),
        }),
      });
});

test("signup -> login -> create project -> delete project, end to end through the real UI", async ({ page }) => {
  const email = `e2e-journey-${Date.now()}@example.com`;
  const password = "Test1234!E2EJourney";
  const projectName = `e2e-journey-project-${Date.now()}`;

  // --- Sign up through the real form ---
  await page.goto("/signup");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();

  // --- Log out, then log back in with the same real credentials ---
  await page.getByTitle("Log out").click();
  await page.waitForURL("**/login", { timeout: 15000 });
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });

  // --- Create a real project through the real dialog, leaving the optional
  // URL fields blank (the common first-project case) ---
  await page.getByRole("button", { name: "New Project" }).first().click();
  await page.fill("#name", projectName);
  await page.getByRole("button", { name: "Create project" }).click();
  // Exact heading match, not a substring getByText — the dashboard's
  // OnboardingChecklist widget renders "Getting started with <project name>",
  // which also contains the project name and would otherwise make this
  // locator ambiguous (strict-mode violation).
  await expect(page.getByRole("heading", { name: projectName, exact: true })).toBeVisible({ timeout: 10000 });

  // --- Navigate into it and confirm the overview page renders real project state ---
  await page.getByRole("link", { name: projectName }).click();
  await page.waitForURL("**/overview", { timeout: 10000 });
  await expect(page.getByText("Connections", { exact: true })).toBeVisible();

  // --- Back to the dashboard (client-side nav, keeping the live Firestore
  // listener alive rather than tearing it down with a full reload) ---
  await page.getByRole("link", { name: "AI QA Agent" }).click();
  await page.waitForURL("**/dashboard", { timeout: 10000 });
  await expect(page.getByRole("heading", { name: projectName, exact: true })).toBeVisible({ timeout: 10000 });
  await page.getByTitle("Delete project").first().click();
  await expect(page.getByRole("heading", { name: projectName, exact: true })).not.toBeVisible({ timeout: 10000 });

  // --- Cleanup: the auth user itself (project doc was already deleted through the UI) ---
  const auth = getAuth(adminApp);
  const user = await auth.getUserByEmail(email);
  await auth.deleteUser(user.uid);

  // Defensive sweep in case the UI delete above ever regresses silently.
  const db = getFirestore(adminApp);
  const leftover = await db.collection("projects").where("ownerId", "==", user.uid).get();
  await Promise.all(leftover.docs.map((d) => d.ref.delete()));
});
