import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase-admin", () => ({
  requireFirebaseUser: vi.fn(async () => ({ uid: "alice" })),
}));
vi.mock("@/utils/database", () => ({ connectToDB: vi.fn(async () => undefined) }));
vi.mock("@/lib/notify", () => ({ sendCategoryPush: vi.fn(async () => ({ sent: 0 })) }));
const blocks = vi.hoisted(() => ({ blocked: false }));
vi.mock("@/lib/blocks", () => ({ isBlockedBetween: vi.fn(async () => blocks.blocked) }));
const extra = vi.hoisted(() => ({ follows: false, destroyed: [] as unknown[], linked: [] as unknown[], deleteTarget: null as null | Record<string, unknown>, updates: [] as unknown[] }));
vi.mock("@/models/follow", () => ({ default: { exists: vi.fn(async () => (extra.follows ? { _id: "f" } : null)) } }));
vi.mock("@/models/chatAttachment", () => ({ default: { updateOne: vi.fn(async (...args: unknown[]) => extra.linked.push(args)) } }));
vi.mock("@/lib/chat-attachment-store", () => ({ destroyAttachments: vi.fn(async (filter: unknown) => extra.destroyed.push(filter)) }));

const state = vi.hoisted(() => ({
  existing: null as null | Record<string, unknown>,
  recent: 0,
  createError: null as null | { code: number },
  created: 0,
}));

const conversation = {
  _id: "c1",
  participants: ["u-alice", "u-bob"],
  mutedBy: [] as string[],
  requestFor: [] as string[],
  declinedBy: [] as string[],
  lastMessage: "m-old" as string | undefined,
  encryptionVersion: 1,
  save: vi.fn(),
};
vi.mock("@/models/user", () => ({
  default: { findOne: vi.fn(() => ({ select: async () => ({ _id: "u-alice", name: "Alice", image: "", firebaseId: "alice" }) })) },
}));
vi.mock("@/models/conversation", () => ({ default: { findOne: vi.fn(async () => conversation) } }));
vi.mock("@/models/message", () => ({
  default: {
    findOne: vi.fn(() => ({ populate: async () => state.existing })),
    countDocuments: vi.fn(async () => state.recent),
    findById: vi.fn(() => ({ select: async () => extra.deleteTarget })),
    updateOne: vi.fn(async (...args: unknown[]) => extra.updates.push(args)),
    updateMany: vi.fn(async () => ({ modifiedCount: 1 })),
    create: vi.fn(async (doc: Record<string, unknown>) => {
      if (state.createError) {
        const error = state.createError;
        state.createError = null;
        state.existing = { _id: "m-winner", ...doc };
        throw error;
      }
      state.created += 1;
      return { _id: "m-new", createdAt: new Date(), ...doc, populate: async () => undefined };
    }),
  },
}));

import { DELETE, PATCH, POST } from "../../app/api/chat/messages/route";
import { sendCategoryPush } from "@/lib/notify";

function send(body: Record<string, unknown>) {
  return POST(new NextRequest("https://mind-fuel.test/api/chat/messages", {
    method: "POST",
    headers: { Authorization: "Bearer t", "Content-Type": "application/json" },
    body: JSON.stringify({ conversationId: "c1", ciphertext: "abc", iv: "iv", encryptionVersion: 1, ...body }),
  }));
}

describe("POST /api/chat/messages", () => {
  beforeEach(() => {
    state.existing = null;
    state.recent = 0;
    state.createError = null;
    state.created = 0;
    blocks.blocked = false;
    conversation.mutedBy = [];
    conversation.requestFor = [];
    conversation.declinedBy = [];
    conversation.lastMessage = "m-old";
    Object.assign(extra, { follows: false, destroyed: [], linked: [], deleteTarget: null, updates: [] });
    vi.mocked(sendCategoryPush).mockClear();
  });

  it("returns the original for a retried clientMessageId instead of duplicating", async () => {
    state.existing = { _id: "m-original" };
    const response = await send({ clientMessageId: "retry-1234567" });
    expect(response.status).toBe(200);
    expect((await response.json()).message._id).toBe("m-original");
    expect(state.created).toBe(0);
  });

  it("resolves a concurrent duplicate to the stored message", async () => {
    state.createError = { code: 11000 };
    const response = await send({ clientMessageId: "race-12345678" });
    expect(response.status).toBe(200);
    expect((await response.json()).duplicate).toBe(true);
  });

  it("rate-limits bursts", async () => {
    state.recent = 30;
    const response = await send({ clientMessageId: "burst-1234567" });
    expect(response.status).toBe(429);
  });

  it("creates new messages normally", async () => {
    const response = await send({ clientMessageId: "fresh-1234567" });
    expect(response.status).toBe(201);
    expect(state.created).toBe(1);
  });

  it("refuses to send when either person has blocked the other", async () => {
    blocks.blocked = true;
    const response = await send({ clientMessageId: "blocked-123456" });
    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("blocked");
    expect(state.created).toBe(0);
  });

  it("delivers to a muted recipient without a push", async () => {
    conversation.mutedBy = ["u-bob"];
    const response = await send({ clientMessageId: "muted-1234567" });
    expect(response.status).toBe(201);
    expect(sendCategoryPush).not.toHaveBeenCalled();
  });

  it("pushes to an unmuted recipient", async () => {
    await send({ clientMessageId: "pushed-123456" });
    expect(sendCategoryPush).toHaveBeenCalledWith(expect.objectContaining({ userId: "u-bob", category: "messages" }));
  });

  it("makes a first message to a non-follower a request, pushed once as a request", async () => {
    conversation.lastMessage = undefined;
    await send({ clientMessageId: "first-1234567" });
    expect(conversation.requestFor).toEqual(["u-bob"]);
    expect(sendCategoryPush).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({ title: "Message request from Alice" }),
    }));
  });

  it("starts a normal conversation when the recipient already follows the sender", async () => {
    conversation.lastMessage = undefined;
    extra.follows = true;
    await send({ clientMessageId: "first-2345678" });
    expect(conversation.requestFor).toEqual([]);
  });

  it("doesn't push follow-up messages while a request is pending, or to someone who declined", async () => {
    conversation.requestFor = ["u-bob"];
    await send({ clientMessageId: "again-1234567" });
    conversation.requestFor = [];
    conversation.declinedBy = ["u-bob"];
    await send({ clientMessageId: "again-2345678" });
    expect(sendCategoryPush).not.toHaveBeenCalled();
  });

  it("treats a reply from the requested person as accepting", async () => {
    conversation.requestFor = ["u-alice"];
    await send({ clientMessageId: "reply-1234567" });
    expect(conversation.requestFor).toEqual([]);
  });

  it("links a sent photo to its message", async () => {
    await send({ clientMessageId: "photo-1234567", encryptionVersion: 2, attachmentId: "6a1b2c3d4e5f60718293a4b5" });
    expect(extra.linked).toHaveLength(1);
  });

  it("keeps read receipts quiet while a request is pending", async () => {
    conversation.requestFor = ["u-alice"];
    const response = await PATCH(new NextRequest("https://mind-fuel.test/api/chat/messages", {
      method: "PATCH", body: JSON.stringify({ conversationId: "c1" }),
    }));
    expect((await response.json()).pendingRequest).toBe(true);
  });
});

describe("DELETE /api/chat/messages", () => {
  const remove = (scope: string) => DELETE(new NextRequest("https://mind-fuel.test/api/chat/messages", {
    method: "DELETE", body: JSON.stringify({ messageId: "6a1b2c3d4e5f60718293a4b5", scope }),
  }));
  beforeEach(() => Object.assign(extra, { destroyed: [], updates: [] }));

  it("hides a message for the viewer only", async () => {
    extra.deleteTarget = { _id: "m1", conversation: "c1", sender: "u-bob" };
    expect((await remove("me")).status).toBe(200);
    expect(extra.updates[0]).toEqual([{ _id: "6a1b2c3d4e5f60718293a4b5" }, { $addToSet: { hiddenFor: "u-alice" } }]);
    expect(extra.destroyed).toEqual([]);
  });

  it("lets only the sender delete for everyone, erasing content and photos", async () => {
    extra.deleteTarget = { _id: "m1", conversation: "c1", sender: "u-bob" };
    expect((await remove("everyone")).status).toBe(403);
    extra.deleteTarget = { _id: "m1", conversation: "c1", sender: "u-alice" };
    expect((await remove("everyone")).status).toBe(200);
    expect(extra.updates[0]).toEqual([
      { _id: "6a1b2c3d4e5f60718293a4b5" },
      { $set: expect.objectContaining({ ciphertext: "", iv: "", text: "", reactions: [] }) },
    ]);
    expect(extra.destroyed).toEqual([{ message: "m1" }]);
  });

  it("rejects bad input and missing messages", async () => {
    expect((await remove("all")).status).toBe(400);
    extra.deleteTarget = null;
    expect((await remove("me")).status).toBe(404);
  });
});
