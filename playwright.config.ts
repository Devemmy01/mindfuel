import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PW_PORT || 3100);

/**
 * Device projects are *emulation*: viewport, touch, user agent and DPR. They
 * are not a substitute for a real iPhone or Android device (push, install,
 * keyboard, safe areas); see docs/mobile-qa-checklist.md for those.
 *
 * WebKit projects need system libraries that `npx playwright install
 * --with-deps webkit` provides (CI does this). Locally, run
 * `--project=desktop --project=pixel-7` if WebKit cannot start.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `PORT=${PORT} npm run dev`,
    url: `http://localhost:${PORT}/api/push/config`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "pixel-7", use: { ...devices["Pixel 7"] } },
    { name: "iphone-14", use: { ...devices["iPhone 14"] } },
    { name: "ipad", use: { ...devices["iPad (gen 7)"] } },
  ],
});
