import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const verifiedUid = vi.hoisted(() => ({ value: null as string | null }));

vi.mock("@/lib/firebase-admin", () => ({
  requireFirebaseUser: vi.fn(async () =>
    verifiedUid.value ? { uid: verifiedUid.value, email: `${verifiedUid.value}@example.com` } : null,
  ),
  verifyFirebaseToken: vi.fn(async () => null),
}));
vi.mock("@/lib/resend", () => ({ resend: { emails: { send: vi.fn() } } }));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn(), unstable_cache: (fn: unknown) => fn }));
vi.mock("@/utils/database", () => ({ connectToDB: vi.fn(async () => undefined) }));

const userFindOne = vi.hoisted(() => vi.fn());
vi.mock("@/models/user", () => ({ default: { findOne: userFindOne, findById: vi.fn() } }));

import { isCronAuthorized } from "@/lib/api-auth";
import { GET as getNotifications, PATCH as readNotifications } from "../../app/api/notifications/route";
import { POST as subscribePush } from "../../app/api/push/subscribe/route";
import { POST as createPost } from "../../app/api/posts/route";
import { POST as updateProfile } from "../../app/api/users/profile/route";
import { GET as getSaves } from "../../app/api/saves/route";
import { GET as getCollections } from "../../app/api/collections/route";

function request(url: string, init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}) {
  return new NextRequest(new URL(url, "https://mind-fuel.test"), {
    method: init.method || "GET",
    headers: init.headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

describe("API identity comes from the verified token", () => {
  beforeEach(() => {
    verifiedUid.value = null;
    userFindOne.mockReset();
  });

  it.each([
    ["GET /api/notifications", () => getNotifications(request("/api/notifications?userId=victim"))],
    ["PATCH /api/notifications", () => readNotifications(request("/api/notifications", { method: "PATCH", body: { userId: "victim" } }))],
    ["POST /api/push/subscribe", () => subscribePush(request("/api/push/subscribe", {
      method: "POST",
      body: { userId: "victim", subscription: { endpoint: "https://push.example/1", keys: { p256dh: "a", auth: "b" } } },
    }))],
    ["POST /api/posts", () => createPost(request("/api/posts", { method: "POST", body: { userId: "victim", text: "hi" } }))],
    ["POST /api/users/profile", () => updateProfile(request("/api/users/profile", { method: "POST", body: { firebaseId: "victim", bio: "x" } }))],
    ["GET /api/saves", () => getSaves(request("/api/saves?userId=victim"))],
    ["GET /api/collections", () => getCollections(request("/api/collections?userId=victim"))],
  ])("%s rejects a client-supplied user id without a token", async (_name, call) => {
    const response = await call();
    expect(response.status).toBe(401);
    expect(userFindOne).not.toHaveBeenCalled();
  });

  it("reads notifications for the token's user, not the query's", async () => {
    verifiedUid.value = "alice";
    userFindOne.mockResolvedValue(null);
    const response = await getNotifications(request("/api/notifications?userId=victim"));
    expect(response.status).toBe(200);
    expect(userFindOne).toHaveBeenCalledWith({ firebaseId: "alice" });
  });

  it("subscribes push for the token's user, not the body's", async () => {
    verifiedUid.value = "alice";
    userFindOne.mockResolvedValue(null);
    await subscribePush(request("/api/push/subscribe", {
      method: "POST",
      body: { userId: "victim", subscription: { endpoint: "https://push.example/1", keys: { p256dh: "a", auth: "b" } } },
    }));
    expect(userFindOne).toHaveBeenCalledWith({ firebaseId: "alice" });
  });
});

describe("isCronAuthorized", () => {
  const original = { ...process.env };
  afterEach(() => {
    process.env = { ...original };
  });

  it("requires the bearer secret and ignores the vercel-cron user agent", () => {
    process.env.CRON_SECRET = "s3cret";
    expect(isCronAuthorized(request("/api/cron/x", { headers: { "user-agent": "vercel-cron/1.0" } }))).toBe(false);
    expect(isCronAuthorized(request("/api/cron/x", { headers: { authorization: "Bearer wrong" } }))).toBe(false);
    expect(isCronAuthorized(request("/api/cron/x", { headers: { authorization: "Bearer s3cret" } }))).toBe(true);
  });

  it("fails closed outside development when no secret is configured", () => {
    delete process.env.CRON_SECRET;
    vi.stubEnv("NODE_ENV", "production");
    expect(isCronAuthorized(request("/api/cron/x"))).toBe(false);
    vi.unstubAllEnvs();
  });
});
