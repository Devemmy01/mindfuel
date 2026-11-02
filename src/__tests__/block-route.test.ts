import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const viewer = vi.hoisted(() => ({ uid: "alice" as string | null }));
vi.mock("@/lib/api-auth", () => ({
  getViewerUid: vi.fn(async () => viewer.uid),
  unauthorized: () => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
}));
vi.mock("@/utils/database", () => ({ connectToDB: vi.fn(async () => undefined) }));

const state = vi.hoisted(() => ({
  blocks: [] as Array<{ blocker: string; blocked: string }>,
  followDeletes: [] as unknown[],
}));
const ids: Record<string, string> = { alice: "u-alice", bob: "u-bob" };
vi.mock("@/models/user", () => ({
  default: {
    findOne: vi.fn(({ firebaseId }: { firebaseId: string }) => ({
      select: () => ({ lean: async () => (ids[firebaseId] ? { _id: ids[firebaseId] } : null) }),
    })),
  },
}));
vi.mock("@/models/follow", () => ({ default: { deleteMany: vi.fn(async (filter: unknown) => state.followDeletes.push(filter)) } }));
vi.mock("@/models/block", () => ({
  default: {
    updateOne: vi.fn(async (filter: { blocker: string; blocked: string }) => {
      if (!state.blocks.some((row) => row.blocker === filter.blocker && row.blocked === filter.blocked)) state.blocks.push(filter);
    }),
    deleteOne: vi.fn(async (filter: { blocker: string; blocked: string }) => {
      state.blocks = state.blocks.filter((row) => !(row.blocker === filter.blocker && row.blocked === filter.blocked));
    }),
    exists: vi.fn(async (filter: { blocker: string; blocked: string }) =>
      state.blocks.some((row) => row.blocker === filter.blocker && row.blocked === filter.blocked) ? { _id: "b" } : null),
  },
}));

import { DELETE, GET, POST } from "../../app/api/users/block/route";

const call = (handler: (req: NextRequest) => Promise<Response>, method: string, body?: unknown, query = "") =>
  handler(new NextRequest(`https://mind-fuel.test/api/users/block${query}`, { method, body: body ? JSON.stringify(body) : undefined }));

beforeEach(() => {
  viewer.uid = "alice";
  state.blocks = [];
  state.followDeletes = [];
});

describe("/api/users/block", () => {
  it("requires sign-in and refuses blocking yourself", async () => {
    viewer.uid = null;
    expect((await call(POST, "POST", { userId: "bob" })).status).toBe(401);
    viewer.uid = "alice";
    expect((await call(POST, "POST", { userId: "alice" })).status).toBe(400);
  });

  it("blocks, removes follows both ways, and reports status from either side", async () => {
    expect((await call(POST, "POST", { userId: "bob" })).status).toBe(200);
    expect(state.blocks).toEqual([{ blocker: "u-alice", blocked: "u-bob" }]);
    expect(state.followDeletes).toEqual([{ $or: [
      { follower: "u-alice", following: "u-bob" },
      { follower: "u-bob", following: "u-alice" },
    ] }]);
    expect(await (await call(GET, "GET", undefined, "?userId=bob")).json()).toEqual({ blockedByMe: true, blockedMe: false });
    viewer.uid = "bob";
    expect(await (await call(GET, "GET", undefined, "?userId=alice")).json()).toEqual({ blockedByMe: false, blockedMe: true });
  });

  it("unblocks only the viewer's own block", async () => {
    state.blocks = [{ blocker: "u-bob", blocked: "u-alice" }];
    await call(DELETE, "DELETE", { userId: "bob" });
    expect(state.blocks).toHaveLength(1);
  });
});
