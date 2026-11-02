import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * axe-core WCAG 2.1 A/AA scan of public screens (as a guest). Serious and
 * critical violations fail the test; everything is printed for triage.
 */
const PAGES = ["/", "/about", "/feed", "/search", "/notifications", "/create", "/terms", "/guides"];

for (const path of PAGES) {
  test(`axe: ${path}`, async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("mindfuel_onboarding_seen", "true");
      } catch {
        // ignore
      }
    });
    await page.goto(path, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const results = await new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]["page"] }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const blocking = results.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical");
    for (const violation of results.violations) {
      console.log(`[${path}] ${violation.impact} ${violation.id} (${violation.nodes.length}): ${violation.nodes.slice(0, 3).map((node) => node.target.join(" ")).join(" | ")}`);
    }
    expect(blocking.map((violation) => `${violation.id}: ${violation.nodes.length}`)).toEqual([]);
  });
}
