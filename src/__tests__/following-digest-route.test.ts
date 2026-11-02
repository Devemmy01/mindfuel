import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/utils/database", () => ({ connectToDB: vi.fn(async () => undefined) }));
vi.mock("@/lib/notify", () => ({ recordStat: vi.fn(async () => undefined) }));

const state = vi.hoisted(() => ({
  users: [] as Array<Record<string, unknown>>,
  digests: new Map<string, unknown>(),
  updates: [] as Array<{ filter: Record<string, unknown>; update: Record<string, unknown> }>,
  bulk: [] as unknown[],
  sent: [] as Array<{ to: string; subject: string }>,
  failSend: false,
}));

vi.mock("@/models/follow", () => ({ default: { distinct: vi.fn(async () => state.users.map((user) => user._id)) } }));
vi.mock("@/models/user", () => ({
  default: {
    find: vi.fn(() => ({ select: () => ({ lean: async () => state.users }) })),
    updateOne: vi.fn(async (filter: Record<string, unknown>, update: Record<string, unknown>) => {
      state.updates.push({ filter, update });
      return { modifiedCount: 1 };
    }),
    bulkWrite: vi.fn(async (ops: unknown[]) => state.bulk.push(...ops)),
  },
}));
vi.mock("@/lib/following-digest", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/following-digest")>()),
  buildFollowingDigest: vi.fn(async (userId: string) => state.digests.get(userId) ?? null),
}));
vi.mock("@/lib/resend", () => ({
  resend: {
    batch: {
      send: vi.fn(async (emails: Array<{ to: string; subject: string }>) => {
        if (state.failSend) return { data: null, error: { message: "rate limited" } };
        state.sent.push(...emails.map(({ to, subject }) => ({ to, subject })));
        return { data: { data: emails.map((_, i) => ({ id: String(i) })) }, error: null };
      }),
    },
  },
}));

import { GET } from "../../app/api/cron/following-digest/route";

const EIGHT_AM_UTC = new Date("2026-11-10T08:15:00Z");
const digest = {
  posts: [{ id: "p1", text: "A reflection", createdAt: "2026-11-10T02:00:00Z", likes: 3, comments: 1, reposts: 0, author: { name: "Ada" } }],
  authorNames: ["Ada"],
  totalPosts: 1,
};

function cron() {
  return GET(new NextRequest("https://mind-fuel.test/api/cron/following-digest", { headers: { authorization: "Bearer test-secret" } }));
}

beforeEach(() => {
  process.env.CRON_SECRET = "test-secret";
  vi.useFakeTimers({ now: EIGHT_AM_UTC, toFake: ["Date"] });
  state.users = [];
  state.digests.clear();
  state.updates = [];
  state.bulk = [];
  state.sent = [];
  state.failSend = false;
});

describe("GET /api/cron/following-digest", () => {
  it("refuses without the cron secret", async () => {
    const response = await GET(new NextRequest("https://mind-fuel.test/api/cron/following-digest"));
    expect(response.status).toBe(401);
  });

  it("emails only people due now with something new, and records the send", async () => {
    state.users = [
      { _id: "due", email: "due@x.test", notificationSettings: { timezone: "UTC" } },
      { _id: "nothing-new", email: "quiet@x.test", notificationSettings: { timezone: "UTC" } },
      { _id: "wrong-hour", email: "later@x.test", notificationSettings: { timezone: "America/New_York" } },
      { _id: "already", email: "done@x.test", notificationSettings: { timezone: "UTC" }, lastDigestSentOn: "2026-11-10" },
      { _id: "opted-out", email: "off@x.test", notificationSettings: { timezone: "UTC", email: { following: false } } },
    ];
    for (const user of state.users) state.digests.set(String(user._id), digest);
    state.digests.delete("nothing-new");

    const body = await (await cron()).json();
    expect(body).toMatchObject({ due: 2, empty: 1, sent: 1, failed: 0 });
    expect(state.sent).toEqual([{ to: "due@x.test", subject: "Ada shared a new reflection" }]);
    expect(state.updates[0]).toEqual({ filter: { _id: "due", lastDigestSentOn: { $ne: "2026-11-10" } }, update: { $set: { lastDigestSentOn: "2026-11-10" } } });
    expect(state.bulk).toEqual([{ updateOne: { filter: { _id: "due" }, update: { $set: { lastDigestAt: EIGHT_AM_UTC } } } }]);
  });

  it("releases the claim and keeps the window when sending fails", async () => {
    state.users = [{ _id: "due", email: "due@x.test", notificationSettings: { timezone: "UTC" }, lastDigestSentOn: "2026-11-09" }];
    state.digests.set("due", digest);
    state.failSend = true;

    const body = await (await cron()).json();
    expect(body).toMatchObject({ sent: 0, failed: 1 });
    expect(state.updates.at(-1)).toEqual({ filter: { _id: "due", lastDigestSentOn: "2026-11-10" }, update: { $set: { lastDigestSentOn: "2026-11-09" } } });
    expect(state.bulk).toEqual([]);
  });
});
