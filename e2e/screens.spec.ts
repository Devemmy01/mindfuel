import { test, type Page } from "@playwright/test";
import path from "node:path";

/**
 * Review screenshots: desktop 1280x800 and mobile 390x844, dark and light.
 * Run with: PHASE=1 SCREENS="/dev/design" npx playwright test e2e/screens.spec.ts --project=desktop
 * Light captures use ?theme=light where a page supports it, otherwise the
 * `light` class is applied to <html>.
 */
const phase = process.env.PHASE || "dev";
const screens = (process.env.SCREENS || "/dev/design").split(",").map((value) => value.trim()).filter(Boolean);
const outDir = path.join("docs", "ux-review", `phase-${phase}`);

const viewports = [
  { name: "desktop", width: 1280, height: 800, isMobile: false },
  { name: "mobile", width: 390, height: 844, isMobile: true },
];

function slug(route: string) {
  return route.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-").replace(/-+$/, "") || "home";
}

async function applyTheme(page: Page, theme: "dark" | "light") {
  await page.evaluate((name) => {
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(name);
  }, theme);
}

for (const viewport of viewports) {
  test.describe(`${viewport.name}`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.isMobile,
      hasTouch: viewport.isMobile,
      deviceScaleFactor: viewport.isMobile ? 2 : 1,
    });

    for (const route of screens) {
      for (const theme of ["dark", "light"] as const) {
        test(`${route} ${theme}`, async ({ page }) => {
          const url = route.startsWith("/dev/design") ? `${route}?theme=${theme}` : route;
          await page.goto(url, { waitUntil: "networkidle" });
          if (!route.startsWith("/dev/design")) await applyTheme(page, theme);
          await page.waitForTimeout(400);
          await page.screenshot({
            path: path.join(outDir, `${slug(route)}-${viewport.name}-${theme}.png`),
            fullPage: true,
          });
        });
      }
    }
  });
}
