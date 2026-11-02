import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectNoSeriousA11yIssues(page: Page) {
  const results = await new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]["page"] }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const blocking = results.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical");
  expect(blocking.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`)).toEqual([]);
}

/**
 * Phase 8: notification settings and the notification centre, signed in via
 * the build-time auth seam, with every API mocked (no database writes).
 *   PW_PORT=3200 E2E_AUTH_BUILD=1 npx playwright test e2e/notifications.spec.ts
 */
test.skip(!process.env.E2E_AUTH_BUILD, "needs a NEXT_PUBLIC_E2E_AUTH=1 server");

const SETTINGS = {
  push: { daily: true, replies: true, likes: false, follows: true, messages: true, reposts: true, product: false },
  email: { daily: true, replies: true, likes: false, follows: false, messages: false, reposts: true, product: true },
  reminderHour: 20,
  timezone: "Africa/Lagos",
  skipWeekends: false,
  quietStart: 22,
  quietEnd: 7,
};

async function signIn(page: Page) {
  // THEME=light captures review screenshots in the light theme.
  if (process.env.THEME) {
    await page.addInitScript((name) => localStorage.setItem("theme", name), process.env.THEME);
  }
  await page.addInitScript(() => {
    (window as Window & { __mindfuelE2E?: { signIn: string } }).__mindfuelE2E = { signIn: "ok" };
  });
  await page.route("**/api/posts", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({ status: 201, json: { post: { _id: "p1", visibility: "private" }, streak: { streakDays: 1, longestStreak: 1 }, newMilestones: [], firstReflection: false } })
      : route.continue(),
  );
  await page.goto("/");
  await page.getByRole("textbox").fill("Signing in for the test.");
  await page.getByRole("button", { name: /save reflection/i }).click();
  await expect(page.getByRole("heading", { name: "Saved. Day 1 started." })).toBeVisible();
}

test("settings show categories, save a change and list devices", async ({ page }) => {
  const puts: unknown[] = [];
  await page.route("**/api/users/notification-settings*", async (route) => {
    if (route.request().method() === "PUT") {
      puts.push(route.request().postDataJSON());
      return route.fulfill({ json: { settings: SETTINGS } });
    }
    return route.fulfill({
      json: {
        settings: SETTINGS,
        devices: [{ id: "d1", userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 7) Chrome/130", platform: "Android", createdAt: null, lastSeen: "2026-11-01T10:00:00Z" }],
      },
    });
  });
  await signIn(page);
  await page.goto("/settings/notifications");

  await expect(page.getByRole("heading", { name: "Notifications", level: 1 })).toBeVisible();
  const likesPush = page.getByRole("switch", { name: "Likes: push" });
  await expect(likesPush).toHaveAttribute("aria-checked", "false");
  await likesPush.click();
  await expect(likesPush).toHaveAttribute("aria-checked", "true");
  await expect.poll(() => puts).toContainEqual({ push: { likes: true } });
  await expect(page.getByText("Chrome on Android")).toBeVisible();
  await expectNoSeriousA11yIssues(page);
  if (process.env.PHASE) {
    await page.screenshot({ path: `docs/ux-review/phase-${process.env.PHASE}/settings-${test.info().project.name}${process.env.THEME ? `-${process.env.THEME}` : ""}.png`, fullPage: true });
  }
});

test("the notification centre groups by day and marks one read on tap", async ({ page }) => {
  const patches: unknown[] = [];
  const now = Date.now();
  const sender = { name: "Ada Okafor", firebaseId: "ada", image: "" };
  await page.route("**/api/notifications*", async (route) => {
    if (route.request().method() === "PATCH") {
      patches.push(route.request().postDataJSON());
      return route.fulfill({ json: { success: true } });
    }
    return route.fulfill({
      json: {
        unreadCount: 2,
        notifications: [
          { _id: "n1", type: "comment", sender, postId: { _id: "p1", text: "Rest is part of the work" }, isRead: false, createdAt: new Date(now - 60_000).toISOString() },
          { _id: "n2", type: "like", sender, postId: { _id: "p1", text: "Rest is part of the work" }, isRead: false, createdAt: new Date(now - 26 * 3_600_000).toISOString() },
          { _id: "n3", type: "follow", sender, isRead: true, createdAt: new Date(now - 10 * 86_400_000).toISOString() },
        ],
      },
    });
  });
  await page.route("**/api/posts/p1*", (route) => route.fulfill({ status: 404, json: {} }));
  await signIn(page);
  await page.goto("/notifications");

  await expect(page.getByRole("region", { name: "Today" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Yesterday" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Earlier" })).toBeVisible();
  await expect(page.getByRole("button", { name: /mark all read/i })).toBeVisible();
  await expectNoSeriousA11yIssues(page);
  if (process.env.PHASE) {
    await page.screenshot({ path: `docs/ux-review/phase-${process.env.PHASE}/notifications-${test.info().project.name}${process.env.THEME ? `-${process.env.THEME}` : ""}.png`, fullPage: true });
  }
  await page.getByRole("link", { name: /Ada Okafor replied to your reflection/ }).click();
  await expect.poll(() => patches).toContainEqual({ id: "n1" });
});
