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

const state = vi.hoisted(() => ({
  existing: null as null | Record<string, unknown>,
  recent: 0,
  createError: null as null | { code: number },
  created: 0,
}));

const conversation = { _id: "c1", participants: ["u-alice", "u-bob"], mutedBy: [] as string[], encryptionVersion: 1, save: vi.fn() };
vi.mock("@/models/user", () => ({
  default: { findOne: vi.fn(() => ({ select: async () => ({ _id: "u-alice", name: "Alice", image: "", firebaseId: "alice" }) })) },
}));
vi.mock("@/models/conversation", () => ({ default: { findOne: vi.fn(async () => conversation) } }));
vi.mock("@/models/message", () => ({
  default: {
    findOne: vi.fn(() => ({ populate: async () => state.existing })),
    countDocuments: vi.fn(async () => state.recent),
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

import { POST } from "../../app/api/chat/messages/route";
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
});
