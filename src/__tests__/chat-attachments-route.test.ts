import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const s = vi.hoisted(() => ({
  uid: "alice" as string | null,
  member: true,
  blocked: false,
  recent: 0,
  uploads: [] as number[],
  attachment: { conversation: "c1", publicId: "mindfuel_chat/x" } as null | { conversation: string; publicId: string },
}));

vi.mock("@/lib/firebase-admin", () => ({ requireFirebaseUser: vi.fn(async () => (s.uid ? { uid: s.uid } : null)) }));
vi.mock("@/utils/database", () => ({ connectToDB: vi.fn(async () => undefined) }));
vi.mock("@/lib/blocks", () => ({ isBlockedBetween: vi.fn(async () => s.blocked) }));
vi.mock("@/models/user", () => ({ default: { findOne: vi.fn(() => ({ select: async () => ({ _id: "u-alice" }) })) } }));
vi.mock("@/models/conversation", () => ({
  default: {
    findOne: vi.fn(() => ({ select: async () => (s.member ? { _id: "c1", participants: ["u-alice", "u-bob"] } : null) })),
    exists: vi.fn(async () => (s.member ? { _id: "c1" } : null)),
  },
}));
vi.mock("@/models/chatAttachment", () => ({
  default: {
    countDocuments: vi.fn(async () => s.recent),
    create: vi.fn(async (doc: { size: number }) => ({ _id: "6a1b2c3d4e5f60718293a4b5", ...doc })),
    findById: vi.fn(() => ({ select: () => ({ lean: async () => s.attachment }) })),
  },
}));
vi.mock("@/lib/cloudinary", () => ({
  default: {
    uploader: {
      upload_stream: vi.fn((_options: unknown, callback: (error: unknown, result: unknown) => void) => ({
        end: (bytes: Buffer) => {
          s.uploads.push(bytes.length);
          callback(null, { public_id: "mindfuel_chat/new", bytes: bytes.length });
        },
      })),
    },
    utils: { private_download_url: vi.fn(() => "https://api.cloudinary.test/download") },
  },
}));

import { POST } from "../../app/api/chat/attachments/route";
import { GET } from "../../app/api/chat/attachments/[id]/route";

const upload = (bytes = 32, conversationId = "6a1b2c3d4e5f60718293a4b6") =>
  POST(new NextRequest(`https://mind-fuel.test/api/chat/attachments?conversationId=${conversationId}`, {
    method: "POST",
    body: new Uint8Array(bytes),
    headers: { "Content-Type": "application/octet-stream" },
  }));
const download = (id = "6a1b2c3d4e5f60718293a4b5") =>
  GET(new NextRequest(`https://mind-fuel.test/api/chat/attachments/${id}`), { params: Promise.resolve({ id }) });

beforeEach(() => {
  Object.assign(s, { uid: "alice", member: true, blocked: false, recent: 0, uploads: [], attachment: { conversation: "c1", publicId: "mindfuel_chat/x" } });
  vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array([7, 7, 7]))));
});

describe("POST /api/chat/attachments", () => {
  it("stores ciphertext for a participant", async () => {
    const response = await upload(64);
    expect(response.status).toBe(201);
    expect((await response.json()).id).toMatch(/^[a-f0-9]{24}$/);
    expect(s.uploads).toEqual([64]);
  });

  it("refuses strangers, blocked pairs, bursts, empty and oversized uploads", async () => {
    s.uid = null;
    expect((await upload()).status).toBe(401);
    s.uid = "alice";
    s.member = false;
    expect((await upload()).status).toBe(404);
    s.member = true;
    s.blocked = true;
    expect((await upload()).status).toBe(403);
    s.blocked = false;
    s.recent = 20;
    expect((await upload()).status).toBe(429);
    s.recent = 0;
    expect((await upload(0)).status).toBe(400);
    expect((await upload(4_000_001)).status).toBe(413);
    expect((await upload(32, "not-an-id")).status).toBe(400);
    expect(s.uploads).toEqual([]);
  });
});

describe("GET /api/chat/attachments/:id", () => {
  it("returns the stored bytes to a participant, privately cached", async () => {
    const response = await download();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("private");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([7, 7, 7]));
  });

  it("answers 404 alike for a missing attachment and someone else's", async () => {
    s.attachment = null;
    expect((await download()).status).toBe(404);
    s.attachment = { conversation: "c1", publicId: "x" };
    s.member = false;
    expect((await download()).status).toBe(404);
    expect((await download("../x")).status).toBe(404);
  });
});
