import { defineConfig, devices } from "@playwright/test";

/** Visual regression against the real dashboard, real browser, real screenshots
 * compared to committed baselines — never a fabricated pass. Baselines were
 * captured on this dev machine (Windows, Chromium); CI on a different OS may
 * need `--update-snapshots` for a fresh baseline the first time it runs there,
 * since font rendering differs by platform. */
export default defineConfig({
  testDir: "./tests/visual",
  fullyParallel: true,
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
