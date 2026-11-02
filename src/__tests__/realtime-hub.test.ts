import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WebSocket, { WebSocketServer } from "ws";

vi.mock("@/lib/firebase-admin", () => ({
  verifyFirebaseToken: vi.fn(async (token: string) => (token.startsWith("uid-") ? { uid: token } : null)),
}));
vi.mock("@/utils/database", () => ({ connectToDB: vi.fn(async () => undefined) }));
vi.mock("@/models/conversation", () => ({
  default: {
    findById: vi.fn((id: string) => ({
      populate: () => ({
        lean: async () => (id === "c1" ? { participants: [{ firebaseId: "uid-a" }, { firebaseId: "uid-b" }] } : null),
      }),
    })),
  },
}));
vi.mock("@/models/message", () => ({ default: {} }));
vi.mock("@/models/user", () => ({ default: {} }));

import { RealtimeHub } from "@/lib/realtime/hub";

type Frame = { e: string; d?: unknown };

let server: Server;
let hub: RealtimeHub;
let url: string;
const open: WebSocket[] = [];

beforeEach(async () => {
  delete process.env.REDIS_URL;
  hub = new RealtimeHub();
  server = createServer();
  const wss = new WebSocketServer({ server });
  wss.on("connection", (ws) => hub.attach(ws));
  await new Promise<void>((resolve) => server.listen(0, resolve));
  url = `ws://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterEach(async () => {
  for (const ws of open.splice(0)) ws.terminate();
  await hub.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

/** Connect, authenticate and collect every frame received. */
async function client(token: string) {
  const ws = new WebSocket(url);
  open.push(ws);
  const frames: Frame[] = [];
  ws.on("message", (raw) => frames.push(JSON.parse(String(raw))));
  await new Promise((resolve) => ws.once("open", resolve));
  ws.send(JSON.stringify({ e: "auth", d: { token } }));
  await waitFor(() => frames.some((frame) => frame.e === "ready") || ws.readyState === ws.CLOSED);
  return { ws, frames, send: (e: string, d?: unknown) => ws.send(JSON.stringify({ e, d })) };
}

async function waitFor(check: () => boolean, timeout = 2_000) {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeout) throw new Error("Timed out");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

describe("RealtimeHub", () => {
  it("rejects a bad token with 4401", async () => {
    const ws = new WebSocket(url);
    open.push(ws);
    await new Promise((resolve) => ws.once("open", resolve));
    const closed = new Promise<number>((resolve) => ws.once("close", (code) => resolve(code)));
    ws.send(JSON.stringify({ e: "auth", d: { token: "forged" } }));
    expect(await closed).toBe(4401);
  });

  it("ignores events sent before authenticating", async () => {
    const ws = new WebSocket(url);
    open.push(ws);
    const frames: Frame[] = [];
    ws.on("message", (raw) => frames.push(JSON.parse(String(raw))));
    await new Promise((resolve) => ws.once("open", resolve));
    ws.send(JSON.stringify({ e: "presence:query", d: ["uid-a"] }));
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(frames).toEqual([]);
  });

  it("announces presence and answers presence queries", async () => {
    const a = await client("uid-a");
    const b = await client("uid-b");
    await waitFor(() => a.frames.some((f) => f.e === "presence:update"));
    expect(a.frames).toContainEqual({ e: "presence:update", d: { userId: "uid-b", online: true } });

    a.send("presence:query", ["uid-b", "uid-c"]);
    await waitFor(() => a.frames.some((f) => f.e === "presence:snapshot"));
    expect(a.frames.find((f) => f.e === "presence:snapshot")?.d).toEqual({ "uid-b": true, "uid-c": false });

    b.ws.close();
    await waitFor(() => a.frames.some((f) => f.e === "presence:update" && (f.d as { online: boolean }).online === false));
  });

  it("sends typing only to the other participants of a conversation", async () => {
    const a = await client("uid-a");
    const b = await client("uid-b");
    const outsider = await client("uid-x");
    a.send("typing:start", { conversationId: "c1", name: "A" });
    await waitFor(() => b.frames.some((f) => f.e === "typing:update"));
    expect(b.frames.find((f) => f.e === "typing:update")?.d).toEqual({ conversationId: "c1", userId: "uid-a", name: "A", isTyping: true });
    expect(a.frames.some((f) => f.e === "typing:update")).toBe(false);
    expect(outsider.frames.some((f) => f.e === "typing:update")).toBe(false);

    // A non-participant can't publish into the conversation.
    outsider.send("typing:start", { conversationId: "c1", name: "X" });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(b.frames.filter((f) => f.e === "typing:update")).toHaveLength(1);
  });
});
