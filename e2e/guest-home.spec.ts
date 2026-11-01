import { expect, test } from "@playwright/test";

/**
 * Phase 3 acceptance: from a cold load, a guest can type into the composer
 * within one click, with no modal in the way, and the draft carries into the
 * full composer. Runs against public pages only; nothing is written to the DB.
 */
test.describe("guest home", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      try {
        localStorage.setItem("mindfuel_onboarding_seen", "true");
      } catch {
        // Not needed for the home page itself.
      }
    });
  });

  test("a guest can write immediately and keep the draft", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Write one honest reflection a day");

    const composer = page.getByRole("textbox");
    await composer.click();
    await composer.fill("Rest is part of the work, not a break from it.");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page).toHaveURL(/\/create\?prompt=.+&promptId=.+/);
    await expect(page.locator("textarea").first()).toHaveValue("Rest is part of the work, not a break from it.");
  });

  test("how it works and browse are reachable without signing in", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "How it works" })).toBeVisible();
    await page.getByRole("link", { name: "Browse", exact: true }).click();
    await expect(page).toHaveURL(/\/feed/);
  });

  test("SEO: / keeps its canonical, /about carries the FAQ", async ({ page, request }) => {
    await page.goto("/");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /^https?:\/\/[^/]+\/?$/);
    const about = await (await request.get("/about")).text();
    expect(about).toContain('"FAQPage"');
    expect(about).toMatch(/<link rel="canonical" href="[^"]*\/about"/);
  });
});
