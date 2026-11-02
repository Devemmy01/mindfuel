import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Messages list, message requests and accepting one, signed in via the
 * build-time auth seam with every chat API mocked (no database writes).
 *   E2E_AUTH_BUILD=1 PW_PROD=1 npx playwright test e2e/messages.spec.ts
 */
test.skip(!process.env.E2E_AUTH_BUILD, "needs a NEXT_PUBLIC_E2E_AUTH=1 server");

const me = { _id: "u-me", firebaseId: "e2e-user", name: "E2E Tester", username: "tester", image: "" };
const ada = { _id: "u-ada", firebaseId: "ada", name: "Ada Okafor", username: "ada", image: "" };
const kemi = { _id: "u-kemi", firebaseId: "kemi", name: "Kemi Bello", username: "kemi", image: "" };
const conversation = (id: string, other: typeof ada, extra: Record<string, unknown> = {}) => ({
  _id: id,
  participants: [me, other],
  lastMessageAt: new Date().toISOString(),
  unreadCount: 0,
  encryptionVersion: 0,
  ...extra,
});

async function expectNoSeriousA11yIssues(page: Page) {
  const results = await new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]["page"] }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const blocking = results.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical");
  expect(blocking.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`)).toEqual([]);
}

async function signIn(page: Page) {
  if (process.env.THEME) await page.addInitScript((name) => localStorage.setItem("theme", name), process.env.THEME);
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

test("requests sit apart from chats and can be accepted", async ({ page }) => {
  const requestCalls: unknown[] = [];
  let requestPending = true;
  await page.route("**/api/chat/keys*", (route) => route.fulfill({ json: { ok: true } }));
  await page.route("**/api/chat/recovery*", (route) => route.fulfill({ json: { available: true } }));
  await page.route("**/api/chat/typing*", (route) => route.fulfill({ json: { typing: [] } }));
  await page.route("**/api/chat/messages*", (route) => route.fulfill({ json: { messages: [] } }));
  await page.route("**/api/users/block*", (route) => route.fulfill({ json: { blockedByMe: false, blockedMe: false } }));
  await page.route("**/api/chat/conversations/request", async (route) => {
    requestCalls.push(route.request().postDataJSON());
    requestPending = false;
    await route.fulfill({ json: { success: true, action: "accept" } });
  });
  await page.route("**/api/chat/conversations", (route) =>
    route.request().method() === "GET"
      ? route.fulfill({ json: { conversations: [conversation("c-ada", ada), conversation("c-kemi", kemi, { request: requestPending })] } })
      : route.fulfill({ json: {} }),
  );

  await signIn(page);
  // The one-time "how to reply" tip covers the thread; mark it seen.
  await page.evaluate(() => localStorage.setItem("mindfuel:reply-tip:v2:e2e-user", "seen"));
  await page.goto("/messages");

  await expect(page.getByRole("button", { name: /Ada Okafor/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Kemi Bello/ })).toHaveCount(0);
  await page.getByRole("tab", { name: "Requests (1)" }).click();
  await page.getByRole("button", { name: /Kemi Bello/ }).click();
  await expect(page.getByText("isn't someone you follow")).toBeVisible();
  await expectNoSeriousA11yIssues(page);
  if (process.env.PHASE) {
    await page.screenshot({ path: `docs/ux-review/phase-${process.env.PHASE}/messages-request-${test.info().project.name}${process.env.THEME ? `-${process.env.THEME}` : ""}.png` });
  }

  await page.getByRole("button", { name: "Accept" }).click();
  await expect(page.getByText("isn't someone you follow")).toHaveCount(0);
  expect(requestCalls).toEqual([{ conversationId: "c-kemi", action: "accept" }]);
});
