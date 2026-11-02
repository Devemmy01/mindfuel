import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const verifiedUid = vi.hoisted(() => ({ value: null as string | null }));
vi.mock("@/lib/firebase-admin", () => ({
  requireFirebaseUser: vi.fn(async () => (verifiedUid.value ? { uid: verifiedUid.value } : null)),
  verifyFirebaseToken: vi.fn(async () => null),
}));
vi.mock("@/utils/database", () => ({ connectToDB: vi.fn(async () => undefined) }));

const saved = vi.hoisted(() => ({ doc: null as null | Record<string, unknown> }));
function userDoc() {
  const doc: Record<string, unknown> = {
    preferences: {},
    notificationSettings: undefined,
    markModified: vi.fn(),
    save: vi.fn(async () => {
      saved.doc = { ...doc };
    }),
  };
  doc.toObject = () => ({ preferences: doc.preferences, notificationSettings: doc.notificationSettings });
  return doc;
}
vi.mock("@/models/user", () => ({
  default: {
    findOne: vi.fn(() => ({ select: () => Promise.resolve(userDoc()) })),
    findById: vi.fn(() => ({ select: () => Promise.resolve(userDoc()) })),
    updateOne: vi.fn(async () => ({ modifiedCount: 1 })),
  },
}));

import { PUT as putSettings } from "../../app/api/users/notification-settings/route";
import { POST as unsubscribe } from "../../app/api/unsubscribe/route";
import { POST as resubscribe } from "../../app/api/push/resubscribe/route";
import { unsubscribeToken } from "@/lib/unsubscribe";

function request(url: string, init: { method?: string; body?: unknown } = {}) {
  return new NextRequest(new URL(url, "https://mind-fuel.test"), {
    method: init.method || "GET",
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("notification settings API", () => {
  beforeEach(() => {
    verifiedUid.value = null;
    saved.doc = null;
  });

  it("requires sign-in", async () => {
    const response = await putSettings(request("/api/users/notification-settings", { method: "PUT", body: { skipWeekends: true } }));
    expect(response.status).toBe(401);
  });

  it("rejects an invalid timezone", async () => {
    verifiedUid.value = "u1";
    const response = await putSettings(request("/api/users/notification-settings", { method: "PUT", body: { timezone: "Not/AZone" } }));
    expect(response.status).toBe(400);
  });

  it("saves valid changes over the resolved defaults and ignores junk", async () => {
    verifiedUid.value = "u1";
    const response = await putSettings(request("/api/users/notification-settings", {
      method: "PUT",
      body: { push: { likes: true, bogus: true }, reminderHour: 7, timezone: "Africa/Lagos", quietStart: null, extra: "x" },
    }));
    expect(response.status).toBe(200);
    const { settings } = await response.json();
    expect(settings.push.likes).toBe(true);
    expect(settings.push).not.toHaveProperty("bogus");
    expect(settings.reminderHour).toBe(7);
    expect(settings.timezone).toBe("Africa/Lagos");
    expect(settings.quietStart).toBeNull();
    expect(settings).not.toHaveProperty("extra");
  });
});

describe("one-click unsubscribe", () => {
  beforeEach(() => {
    process.env.UNSUBSCRIBE_SECRET = "test-secret";
    saved.doc = null;
  });

  it("turns off only that category's email", async () => {
    const token = unsubscribeToken("665f00000000000000000001", "product")!;
    const response = await unsubscribe(request(`/api/unsubscribe?token=${encodeURIComponent(token)}`, { method: "POST" }));
    expect(response.status).toBe(200);
    const settings = saved.doc?.notificationSettings as { email: Record<string, boolean>; push: Record<string, boolean> };
    expect(settings.email.product).toBe(false);
    expect(settings.email.daily).toBe(true);
    expect(settings.push.daily).toBe(true);
  });

  it("rejects forged tokens", async () => {
    const response = await unsubscribe(request("/api/unsubscribe?token=665f.product.forged", { method: "POST" }));
    expect(response.status).toBe(400);
    expect(saved.doc).toBeNull();
  });
});

describe("push resubscribe", () => {
  it("validates input", async () => {
    const response = await resubscribe(request("/api/push/resubscribe", { method: "POST", body: { oldEndpoint: "x" } }));
    expect(response.status).toBe(400);
  });
});
