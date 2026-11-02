import type { WebSocket } from "ws";
import Redis from "ioredis";
import { connectToDB } from "@/utils/database";
import Conversation from "@/models/conversation";
import Message from "@/models/message";
import User from "@/models/user";
import { verifyFirebaseToken } from "@/lib/firebase-admin";

/**
 * Realtime hub: JSON frames `{ e: event, d: data }` over plain WebSockets.
 *
 * Runs inside a Vercel Function (app/api/socket/route.ts) and inside the
 * local custom server (server.ts). A connection is pinned to one instance, so
 * fan-out across instances goes through Redis pub/sub when REDIS_URL works;
 * without it, delivery is per instance and REST polling covers the gaps.
 * Messages are already encrypted before they reach this layer.
 */

export const REALTIME_PATH = "/api/socket";
const AUTH_TIMEOUT_MS = 10_000;
const HEARTBEAT_MS = 15_000;
const PRESENCE_TTL_S = 60;
const CHANNEL = "mindfuel:realtime";
const ALL = "*";

type Frame = { e: string; d?: unknown };
type Client = { ws: WebSocket; uid: string; rooms: Set<string>; alive: boolean };
type Envelope = { room: string; event: string; data: unknown; except?: string };

const userRoom = (uid: string) => `user:${uid}`;
const conversationRoom = (id: string) => `conversation:${id}`;
const presenceKey = (uid: string) => `rt:presence:${uid}`;

type MemberDoc = { _id: unknown } | null;
type ParticipantsDoc = { participants: Array<{ firebaseId: string }> } | null;

export class RealtimeHub {
  private rooms = new Map<string, Set<Client>>();
  private localPresence = new Map<string, number>();
  private participantCache = new Map<string, { ids: string[]; expiresAt: number }>();
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private redisReady = false;
  private heartbeat: ReturnType<typeof setInterval>;

  constructor() {
    this.connectRedis();
    this.heartbeat = setInterval(() => this.beat(), HEARTBEAT_MS);
    this.heartbeat.unref?.();
  }

  /** Take ownership of an upgraded socket. The first frame must be `auth`. */
  attach(ws: WebSocket) {
    let client: Client | null = null;
    const authTimer = setTimeout(() => ws.close(4401, "Unauthorized"), AUTH_TIMEOUT_MS);

    ws.on("message", async (raw) => {
      let frame: Frame;
      try {
        frame = JSON.parse(String(raw));
      } catch {
        return;
      }
      if (!frame || typeof frame.e !== "string") return;

      if (!client) {
        if (frame.e !== "auth") return;
        const token = String((frame.d as { token?: unknown } | undefined)?.token || "");
        const decoded = await verifyFirebaseToken(token);
        clearTimeout(authTimer);
        if (!decoded || ws.readyState !== ws.OPEN) {
          ws.close(4401, "Unauthorized");
          return;
        }
        client = { ws, uid: decoded.uid, rooms: new Set(), alive: true };
        this.join(client, ALL);
        this.join(client, userRoom(client.uid));
        const first = await this.presenceAdd(client.uid);
        send(ws, "ready");
        if (first) this.publish({ room: ALL, event: "presence:update", data: { userId: client.uid, online: true }, except: client.uid });
        return;
      }
      void this.handle(client, frame).catch((error) => console.error("Realtime handler failed", frame.e, error));
    });

    ws.on("pong", () => {
      if (client) client.alive = true;
    });

    ws.on("close", () => {
      clearTimeout(authTimer);
      if (!client) return;
      const departed = client;
      for (const room of departed.rooms) this.rooms.get(room)?.delete(departed);
      void this.presenceRemove(departed.uid).then((remaining) => {
        if (remaining === 0) this.publish({ room: ALL, event: "presence:update", data: { userId: departed.uid, online: false } });
      });
    });

    ws.on("error", () => ws.terminate());
  }

  private async handle(client: Client, { e: event, d: data }: Frame) {
    const payload = (data || {}) as Record<string, unknown>;
    switch (event) {
      case "presence:query": {
        if (!Array.isArray(data)) return;
        const ids = Array.from(new Set(
          data.filter((id): id is string => typeof id === "string" && id.length > 0 && id.length <= 200).slice(0, 200),
        ));
        send(client.ws, "presence:snapshot", await this.presenceSnapshot(ids));
        return;
      }
      case "conversation:join": {
        const conversationId = typeof data === "string" ? data : "";
        if (conversationId && await this.isMember(client.uid, conversationId)) this.join(client, conversationRoom(conversationId));
        return;
      }
      case "conversation:leave": {
        if (typeof data === "string") this.leave(client, conversationRoom(data));
        return;
      }
      case "message:published":
        return this.publishMessage(client.uid, String(payload.conversationId || ""), payload.message as { _id?: string } | undefined);
      case "typing:start":
      case "typing:stop":
        return this.publishTyping(client.uid, String(payload.conversationId || ""), String(payload.name || "").slice(0, 80), event === "typing:start");
      case "messages:read":
        return this.publishRead(client.uid, String(payload.conversationId || ""));
      case "message:reaction":
        return this.publishReaction(client.uid, String(payload.conversationId || ""), String(payload.messageId || ""));
    }
  }

  private async participantIds(conversationId: string) {
    const cached = this.participantCache.get(conversationId);
    if (cached && cached.expiresAt > Date.now()) return cached.ids;
    await connectToDB();
    const conversation = await Conversation.findById(conversationId)
      .populate("participants", "firebaseId")
      .lean() as unknown as ParticipantsDoc;
    const ids = conversation?.participants.map((participant) => participant.firebaseId).filter(Boolean) || [];
    this.participantCache.set(conversationId, { ids, expiresAt: Date.now() + 30_000 });
    return ids;
  }

  private async isMember(uid: string, conversationId: string) {
    try {
      return (await this.participantIds(conversationId)).includes(uid);
    } catch (error) {
      console.error("Realtime room authorization failed", error);
      return false;
    }
  }

  private async toOtherParticipants(uid: string, conversationId: string, event: string, data: unknown) {
    const ids = await this.participantIds(conversationId);
    if (!ids.includes(uid)) return;
    for (const id of ids) if (id !== uid) this.publish({ room: userRoom(id), event, data });
  }

  private async publishMessage(uid: string, conversationId: string, message?: { _id?: string }) {
    if (!conversationId || !message?._id) return;
    await connectToDB();
    const sender = await User.findOne({ firebaseId: uid }).select("_id").lean() as unknown as MemberDoc;
    if (!sender) return;
    const [conversation, storedMessage] = await Promise.all([
      Conversation.findOne({ _id: conversationId, participants: sender._id })
        .populate("participants", "name username image firebaseId")
        .lean(),
      Message.findOne({ _id: message._id, conversation: conversationId, sender: sender._id })
        .populate("sender", "name username image firebaseId")
        .populate({
          path: "replyTo",
          select: "text sender createdAt",
          populate: { path: "sender", select: "name username image firebaseId" },
        })
        .lean(),
    ]) as unknown as [ParticipantsDoc, Record<string, unknown> | null];
    if (!conversation || !storedMessage) return;
    for (const participant of conversation.participants) {
      if (participant.firebaseId === uid) continue;
      this.publish({
        room: userRoom(participant.firebaseId),
        event: "conversation:message",
        data: { conversationId, conversation, message: storedMessage },
      });
    }
  }

  private async publishTyping(uid: string, conversationId: string, name: string, isTyping: boolean) {
    if (!conversationId) return;
    await this.toOtherParticipants(uid, conversationId, "typing:update", { conversationId, userId: uid, name, isTyping });
  }

  private async publishRead(uid: string, conversationId: string) {
    if (!conversationId) return;
    await this.toOtherParticipants(uid, conversationId, "messages:read", { conversationId, userId: uid });
  }

  private async publishReaction(uid: string, conversationId: string, messageId: string) {
    if (!conversationId || !messageId || !await this.isMember(uid, conversationId)) return;
    await connectToDB();
    const message = await Message.findOne({ _id: messageId, conversation: conversationId })
      .populate("reactions.users", "firebaseId").select("reactions").lean() as unknown as { reactions: unknown[] } | null;
    if (message) {
      this.publish({ room: conversationRoom(conversationId), event: "message:reaction", data: { conversationId, messageId, reactions: message.reactions } });
    }
  }

  private join(client: Client, room: string) {
    client.rooms.add(room);
    let members = this.rooms.get(room);
    if (!members) this.rooms.set(room, (members = new Set()));
    members.add(client);
  }

  private leave(client: Client, room: string) {
    client.rooms.delete(room);
    const members = this.rooms.get(room);
    members?.delete(client);
    if (members?.size === 0) this.rooms.delete(room);
  }

  /** Deliver to every instance (Redis) or to this one. */
  private publish(envelope: Envelope) {
    if (this.redisReady && this.publisher) {
      this.publisher.publish(CHANNEL, JSON.stringify(envelope)).catch(() => this.deliver(envelope));
      return;
    }
    this.deliver(envelope);
  }

  private deliver({ room, event, data, except }: Envelope) {
    const members = this.rooms.get(room);
    if (!members) return;
    for (const client of members) {
      if (except && client.uid === except) continue;
      send(client.ws, event, data);
    }
  }

  private async presenceAdd(uid: string) {
    const local = (this.localPresence.get(uid) || 0) + 1;
    this.localPresence.set(uid, local);
    if (!this.redisReady || !this.publisher) return local === 1;
    try {
      const total = await this.publisher.incr(presenceKey(uid));
      await this.publisher.expire(presenceKey(uid), PRESENCE_TTL_S);
      return total === 1;
    } catch {
      return local === 1;
    }
  }

  private async presenceRemove(uid: string) {
    const local = Math.max(0, (this.localPresence.get(uid) || 0) - 1);
    if (local === 0) this.localPresence.delete(uid);
    else this.localPresence.set(uid, local);
    if (!this.redisReady || !this.publisher) return local;
    try {
      const total = await this.publisher.decr(presenceKey(uid));
      if (total <= 0) await this.publisher.del(presenceKey(uid));
      return Math.max(0, total);
    } catch {
      return local;
    }
  }

  private async presenceSnapshot(ids: string[]) {
    const snapshot: Record<string, boolean> = {};
    for (const id of ids) snapshot[id] = (this.localPresence.get(id) || 0) > 0;
    if (!this.redisReady || !this.publisher || ids.length === 0) return snapshot;
    try {
      const counts = await this.publisher.mget(ids.map(presenceKey));
      ids.forEach((id, index) => {
        snapshot[id] = snapshot[id] || Number(counts[index] || 0) > 0;
      });
    } catch {
      // Local presence is still a useful answer.
    }
    return snapshot;
  }

  /** Drop dead connections (mobile sockets often vanish without a close frame) and keep presence keys alive. */
  private beat() {
    const seen = new Set<string>();
    for (const client of this.rooms.get(ALL) || []) {
      if (!client.alive) {
        client.ws.terminate();
        continue;
      }
      client.alive = false;
      client.ws.ping();
      seen.add(client.uid);
    }
    if (this.redisReady && this.publisher && seen.size) {
      const pipeline = this.publisher.pipeline();
      for (const uid of seen) pipeline.expire(presenceKey(uid), PRESENCE_TTL_S);
      pipeline.exec().catch(() => undefined);
    }
  }

  private connectRedis() {
    const url = process.env.REDIS_URL;
    if (!url || !/^rediss?:\/\//i.test(url)) return;
    const options = { connectTimeout: 3_000, maxRetriesPerRequest: 1, enableOfflineQueue: false, lazyConnect: true };
    const publisher = new Redis(url, options);
    const subscriber = new Redis(url, options);
    let warned = false;
    const onError = (error: Error) => {
      this.redisReady = false;
      if (!warned) console.error("Realtime Redis unavailable; delivering per instance:", error.message);
      warned = true;
    };
    publisher.on("error", onError);
    subscriber.on("error", onError);
    subscriber.on("message", (_channel, raw) => {
      try {
        this.deliver(JSON.parse(raw) as Envelope);
      } catch {
        // Ignore malformed envelopes.
      }
    });
    Promise.all([publisher.connect(), subscriber.connect()])
      .then(() => subscriber.subscribe(CHANNEL))
      .then(() => {
        this.publisher = publisher;
        this.subscriber = subscriber;
        this.redisReady = true;
        publisher.on("ready", () => (this.redisReady = true));
      })
      .catch((error) => {
        onError(error);
        publisher.disconnect();
        subscriber.disconnect();
      });
  }

  async close() {
    clearInterval(this.heartbeat);
    for (const client of this.rooms.get(ALL) || []) client.ws.close(1001, "Server shutting down");
    await Promise.allSettled([this.publisher?.quit(), this.subscriber?.quit()]);
  }
}

function send(ws: WebSocket, event: string, data?: unknown) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(data === undefined ? { e: event } : { e: event, d: data }));
}

const globalHub = globalThis as typeof globalThis & { __mindfuelRealtimeHub?: RealtimeHub };

/** One hub per process (Fluid compute reuses an instance across connections). */
export function getRealtimeHub() {
  globalHub.__mindfuelRealtimeHub ??= new RealtimeHub();
  return globalHub.__mindfuelRealtimeHub;
}
