import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const verifiedUid = vi.hoisted(() => ({ value: null as string | null }));
vi.mock("@/lib/firebase-admin", () => ({
  requireFirebaseUser: vi.fn(async () => (verifiedUid.value ? { uid: verifiedUid.value } : null)),
  verifyFirebaseToken: vi.fn(async () => null),
}));
vi.mock("@/utils/database", () => ({ connectToDB: vi.fn(async () => undefined) }));
vi.mock("@/lib/resend", () => ({ resend: { emails: { send: vi.fn() } } }));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn(), unstable_cache: (fn: unknown) => fn }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/notifications", () => ({ createNotification: vi.fn() }));

/** Chainable stand-in for a Mongoose query that resolves to `value`. */
function query<T>(value: T) {
  const chain: Record<string, unknown> = {};
  for (const method of ["populate", "select", "sort", "limit", "skip"]) chain[method] = () => chain;
  chain.lean = async () => value;
  chain.then = (resolve: (v: T) => unknown) => Promise.resolve(value).then(resolve);
  return chain;
}

const db = vi.hoisted(() => ({
  users: new Map<string, { _id: string; firebaseId: string; name: string }>(),
  post: null as null | Record<string, unknown>,
  created: [] as Array<Record<string, unknown>>,
  synced: [] as Array<{ nextText: string }>,
}));

vi.mock("@/models/user", () => ({
  default: {
    findOne: vi.fn((filter: { firebaseId: string }) => query(db.users.get(filter.firebaseId) ?? null)),
    findById: vi.fn(() => query(null)),
    findByIdAndUpdate: vi.fn(async () => ({ streakDays: 1, longestStreak: 1 })),
  },
}));

vi.mock("@/models/post", () => {
  const matches = (filter: Record<string, unknown>) => {
    const post = db.post;
    if (!post || String(filter._id) !== String(post._id)) return null;
    if (filter.visibility && post.visibility === "private") return null;
    const anyOf = filter.$or as Array<Record<string, unknown>> | undefined;
    if (anyOf && !anyOf.some((clause) =>
      ("visibility" in clause && post.visibility !== "private") ||
      ("userId" in clause && String(clause.userId) === String(post.userId)))) return null;
    return post;
  };
  return {
    default: {
      findById: vi.fn((id: string) => query(db.post && String(db.post._id) === id ? db.post : null)),
      exists: vi.fn(async (filter: Record<string, unknown>) => (matches(filter) ? { _id: filter._id } : null)),
      findByIdAndUpdate: vi.fn(async () => db.post),
      countDocuments: vi.fn(async () => 1),
      create: vi.fn(async (doc: Record<string, unknown>) => {
        db.created.push(doc);
        return { ...doc, _id: "665f00000000000000000001", save: async () => undefined };
      }),
    },
  };
});

vi.mock("@/lib/hashtags", async () => {
  const core = await import("@/lib/hashtags-core");
  return {
    extractHashtags: core.extractHashtags,
    syncPostHashtags: vi.fn(async ({ nextText }: { nextText: string }) => {
      db.synced.push({ nextText });
      return core.extractHashtags(nextText);
    }),
  };
});

vi.mock("@/models/like", () => ({ default: { findOne: vi.fn(async () => null), create: vi.fn(), deleteOne: vi.fn() } }));

import { GET as getPost } from "../../app/api/posts/[id]/route";
import { POST as likePost } from "../../app/api/posts/[id]/like/route";
import { POST as createPost } from "../../app/api/posts/route";

const POST_ID = "665f0000000000000000abcd";
const params = { params: Promise.resolve({ id: POST_ID }) };

function request(url: string, init: { method?: string; body?: unknown } = {}) {
  return new NextRequest(new URL(url, "https://mind-fuel.test"), {
    method: init.method || "GET",
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

describe("private reflections", () => {
  beforeEach(() => {
    verifiedUid.value = null;
    db.users = new Map([
      ["author-uid", { _id: "u-author", firebaseId: "author-uid", name: "Author" }],
      ["other-uid", { _id: "u-other", firebaseId: "other-uid", name: "Other" }],
    ]);
    db.post = { _id: POST_ID, userId: "u-author", visibility: "private", text: "just for me" };
    db.created = [];
    db.synced = [];
  });

  it.each([
    ["a guest", null],
    ["another member", "other-uid"],
  ])("are not found for %s", async (_who, uid) => {
    verifiedUid.value = uid;
    const response = await getPost(request(`/api/posts/${POST_ID}`), params);
    expect(response.status).toBe(404);
  });

  it("are readable by their author, uncached", async () => {
    verifiedUid.value = "author-uid";
    const response = await getPost(request(`/api/posts/${POST_ID}`), params);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("cannot be liked by someone else", async () => {
    verifiedUid.value = "other-uid";
    const response = await likePost(request(`/api/posts/${POST_ID}/like`, { method: "POST" }), params);
    expect(response.status).toBe(404);
  });

  it("legacy posts without a visibility field stay public", async () => {
    db.post = { _id: POST_ID, userId: "u-author", text: "old post" };
    const response = await getPost(request(`/api/posts/${POST_ID}`), params);
    expect(response.status).toBe(200);
  });
});

describe("creating a reflection", () => {
  beforeEach(() => {
    verifiedUid.value = "author-uid";
    db.created = [];
    db.synced = [];
  });

  it("defaults to private and keeps tags out of the public index", async () => {
    const response = await createPost(request("/api/posts", { method: "POST", body: { text: "learning #growth" } }));
    expect(response.status).toBe(201);
    expect(db.created[0].visibility).toBe("private");
    expect(db.synced).toEqual([]);
  });

  it("indexes hashtags only when shared with the community", async () => {
    await createPost(request("/api/posts", { method: "POST", body: { text: "learning #growth", visibility: "public" } }));
    expect(db.created[0].visibility).toBe("public");
    expect(db.synced).toEqual([{ nextText: "learning #growth" }]);
  });
});
