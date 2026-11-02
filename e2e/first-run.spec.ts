import { expect, test, type Page } from "@playwright/test";

/**
 * Phase 4: the 60-second first-run flow with mocked auth.
 *
 * Requires a server built with NEXT_PUBLIC_E2E_AUTH=1 (see playwright.config
 * notes), which lets the test choose what Google sign-in returns. All writes
 * are intercepted; nothing reaches the database.
 *
 *   PW_PORT=3200 NEXT_PUBLIC_E2E_AUTH=1 E2E_AUTH_BUILD=1 \
 *     npx playwright test e2e/first-run.spec.ts --project=desktop
 */
test.skip(!process.env.E2E_AUTH_BUILD, "needs a NEXT_PUBLIC_E2E_AUTH=1 server");

const TEXT = "Rest is part of the work, not a break from it.";

type Posted = { text: string; visibility: string; promptId?: string };

async function setup(page: Page, signIn: "ok" | "popup-blocked" | "cancelled", failFirstPost = false) {
  const posts: Posted[] = [];
  const profileUpdates: unknown[] = [];
  await page.addInitScript((outcome) => {
    (window as Window & { __mindfuelE2E?: { signIn: string } }).__mindfuelE2E = { signIn: outcome };
  }, signIn);
  let attempts = 0;
  await page.route("**/api/posts", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    attempts += 1;
    if (failFirstPost && attempts === 1) return route.fulfill({ status: 500, json: { error: "boom" } });
    const body = route.request().postDataJSON() as Posted;
    posts.push(body);
    return route.fulfill({
      status: 201,
      json: {
        post: { _id: "665f00000000000000000e2e", text: body.text, visibility: body.visibility },
        streak: { streakDays: 1, longestStreak: 1 },
        newMilestones: [],
        firstReflection: true,
      },
    });
  });
  await page.route("**/api/users/profile", async (route) => {
    profileUpdates.push(route.request().postDataJSON());
    return route.fulfill({ json: { success: true } });
  });
  return { posts, profileUpdates, setSignIn: (outcome: string) => page.evaluate((value) => {
    (window as Window & { __mindfuelE2E?: { signIn: string } }).__mindfuelE2E = { signIn: value };
  }, outcome) };
}

async function write(page: Page) {
  await page.goto("/");
  const composer = page.getByRole("textbox");
  await composer.click();
  await composer.fill(TEXT);
}

test("a guest saves a first private reflection in one pass", async ({ page }) => {
  const { posts, profileUpdates } = await setup(page, "ok");
  const started = Date.now();
  await write(page);
  await expect(page.getByRole("radio", { name: /just me/i })).toHaveAttribute("aria-checked", "true");
  if (process.env.PHASE) {
    await page.screenshot({ path: `docs/ux-review/phase-${process.env.PHASE}/home-composer-filled-${test.info().project.name}.png` });
  }
  await page.getByRole("button", { name: /save reflection/i }).click();

  await expect(page.getByRole("heading", { name: "Saved. Day 1 started." })).toBeVisible();
  const elapsedMs = Date.now() - started;
  test.info().annotations.push({ type: "time-to-first-reflection (mocked auth)", description: `${elapsedMs} ms` });

  expect(posts).toHaveLength(1);
  expect(posts[0].visibility).toBe("private");
  expect(posts[0].text).toMatch(/^Reflecting on: ".+"\n\nRest is part of the work/);
  await expect(page.getByText("Only you can see this reflection.")).toBeVisible();
  if (process.env.PHASE) {
    await page.screenshot({
      path: `docs/ux-review/phase-${process.env.PHASE}/saved-${test.info().project.name}.png`,
      fullPage: true,
    });
  }

  // The coachmark appears on Home after the first reflection and skips with Escape.
  await page.getByRole("link", { name: /read what others wrote today/i }).click();
  await expect(page).toHaveURL(/\/feed/);
  const tour = page.getByRole("region", { name: "Quick tour" });
  await expect(tour).toBeVisible();
  if (process.env.PHASE) {
    await page.screenshot({ path: `docs/ux-review/phase-${process.env.PHASE}/coachmark-${test.info().project.name}.png` });
  }
  await page.keyboard.press("Escape");
  await expect(tour).toHaveCount(0);
  await expect.poll(() => profileUpdates).toContainEqual({ onboarded: true });
});

test("a blocked sign-in popup keeps the text and posts nothing", async ({ page }) => {
  const { posts } = await setup(page, "popup-blocked");
  await write(page);
  await page.getByRole("button", { name: /save reflection/i }).click();
  await expect(page.locator("#write").getByRole("alert")).toContainText("blocked the sign-in window");
  await expect(page.getByRole("textbox")).toHaveValue(TEXT);
  expect(posts).toHaveLength(0);
});

test("cancelling sign-in, then retrying, posts exactly once", async ({ page }) => {
  const { posts, setSignIn } = await setup(page, "cancelled");
  await write(page);
  await page.getByRole("button", { name: /save reflection/i }).click();
  await expect(page.locator("#write").getByRole("alert")).toContainText("cancelled");
  await setSignIn("ok");
  await page.getByRole("button", { name: /save reflection/i }).click();
  await expect(page.getByRole("heading", { name: "Saved. Day 1 started." })).toBeVisible();
  expect(posts).toHaveLength(1);
});

test("a failed save keeps the text and can be retried", async ({ page }) => {
  const { posts } = await setup(page, "ok", true);
  await write(page);
  await page.getByRole("button", { name: /save reflection/i }).click();
  await expect(page.locator("#write").getByRole("alert")).toContainText("couldn't save");
  await expect(page.getByRole("textbox")).toHaveValue(TEXT);
  await page.getByRole("button", { name: /save reflection/i }).click();
  await expect(page.getByRole("heading", { name: "Saved. Day 1 started." })).toBeVisible();
  expect(posts).toHaveLength(1);
});

test("a returning member lands on today's reflection, ready to write", async ({ page, isMobile }) => {
  const { posts } = await setup(page, "ok");
  await page.route("**/api/posts?*", (route) =>
    route.request().method() === "GET" ? route.fulfill({ json: { posts: [], total: 0, hasMore: false } }) : route.continue(),
  );
  // Sign in through the home composer, then open Home as a member would.
  await write(page);
  await page.getByRole("button", { name: /save reflection/i }).click();
  await expect(page.getByRole("heading", { name: "Saved. Day 1 started." })).toBeVisible();
  await page.getByRole("link", { name: /read what others wrote today/i }).click();
  await page.keyboard.press("Escape");

  // A fresh day: no reflection yet, so Home opens on the composer.
  await page.evaluate(() => localStorage.removeItem("mindfuel:draft:v1"));
  const today = page.locator("#write");
  await expect(today.getByText("Today's reflection")).toBeVisible();
  if (!isMobile) await expect(today.getByRole("textbox")).toBeFocused();
  await today.getByRole("textbox").fill("Small steps still count.");
  await today.getByRole("button", { name: /save reflection/i }).click();
  await expect(page.getByRole("heading", { name: "Saved. See you tomorrow." })).toBeVisible();
  expect(posts).toHaveLength(2);
  if (process.env.PHASE) {
    await page.screenshot({ path: `docs/ux-review/phase-${process.env.PHASE}/today-done-${test.info().project.name}.png` });
  }
});
