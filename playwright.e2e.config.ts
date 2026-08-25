import { defineConfig, devices } from "@playwright/test";

/** Real end-to-end journey against the real dev server and real Firebase
 * project — signup/login/create-project/delete-project driven through the
 * actual UI, not seeded. See tests/e2e/user-journey.e2e.spec.ts for exactly
 * which parts of the full journey this can and can't automate, and why. */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm --filter web exec next dev -p 3000",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
