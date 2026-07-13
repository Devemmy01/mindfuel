import type { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import { connectToDB } from "@/utils/database";
import Conversation from "@/models/conversation";
import Message from "@/models/message";
import User from "@/models/user";

export function configureSocketServer(io: Server) {
  let closeRedis: (() => Promise<void>) | undefined;
  const participantCache = new Map<string, { ids: string[]; expiresAt: number }>();

  const getConversationParticipantFirebaseIds = async (conversationId: string) => {
    const cached = participantCache.get(conversationId);
    if (cached && cached.expiresAt > Date.now()) return cached.ids;
    await connectToDB();
    const conversation = await Conversation.findById(conversationId)
      .populate("participants", "firebaseId")
      .lean() as unknown as { participants: Array<{ firebaseId: string }> } | null;
    const ids = conversation?.participants.map((participant) => participant.firebaseId).filter(Boolean) || [];
    participantCache.set(conversationId, {
      ids,
      expiresAt: Date.now() + 30_000,
    });
    return ids;
  };

  const publishTypingUpdate = async (
    userId: string,
    conversationId: string,
    name: string,
    isTyping: boolean,
  ) => {
    if (!conversationId || !userId) return;
    try {
      const participantIds = await getConversationParticipantFirebaseIds(conversationId);
      if (!participantIds.includes(userId)) return;
      for (const participantId of participantIds) {
        if (participantId === userId) continue;
        io.to(`user:${participantId}`).emit("typing:update", {
          conversationId,
          userId,
          name,
          isTyping,
        });
      }
    } catch (error) {
      console.error("Typing publication failed", error);
    }
  };

  if (process.env.REDIS_URL) {
    try {
      if (!/^rediss?:\/\//i.test(process.env.REDIS_URL)) {
        throw new Error("REDIS_URL must use the redis:// or rediss:// protocol");
      }
      const publisher = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
      const subscriber = publisher.duplicate();
      publisher.on("error", (error) => console.error("Redis publisher error", error.message));
      subscriber.on("error", (error) => console.error("Redis subscriber error", error.message));
      io.adapter(createAdapter(publisher, subscriber));
      closeRedis = async () => {
        await Promise.allSettled([publisher.quit(), subscriber.quit()]);
      };
    } catch (error) {
      console.error("Redis socket adapter disabled:", error);
    }
  }

  io.on("connection", (socket) => {
    const userId = String(socket.handshake.auth?.userId || "");
    if (userId) {
      socket.join(`user:${userId}`);
      socket.broadcast.emit("presence:update", { userId, online: true });
    }

    socket.on("conversation:join", async (conversationId: string) => {
      if (!conversationId || !userId) return;
      try {
        await connectToDB();
        const member = await User.findOne({ firebaseId: userId }).select("_id").lean() as unknown as { _id: string } | null;
        if (member && await Conversation.exists({ _id: conversationId, participants: member._id })) {
          socket.join(`conversation:${conversationId}`);
        }
      } catch (error) {
        console.error("Socket room authorization failed", error);
      }
    });
    socket.on("conversation:leave", (conversationId: string) => {
      if (conversationId) socket.leave(`conversation:${conversationId}`);
    });
    socket.on("message:published", async ({ conversationId, message }) => {
      if (!conversationId || !message?._id || !userId) return;
      try {
        await connectToDB();
        const sender = await User.findOne({ firebaseId: userId }).select("_id").lean() as unknown as { _id: string } | null;
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
        ]) as unknown as [
          { participants: Array<{ firebaseId: string }> } | null,
          { sender?: { name?: string; image?: string }; text?: string } & Record<string, unknown> | null,
        ];
        if (!conversation || !storedMessage) return;
        for (const participant of conversation.participants) {
          if (participant.firebaseId !== userId) {
            const recipientRoom = `user:${participant.firebaseId}`;
            io.to(recipientRoom).emit("conversation:message", {
              conversationId,
              conversation,
              message: storedMessage,
            });
          }
        }
      } catch (error) {
        console.error("Message publication failed", error);
      }
    });
    socket.on("typing:start", ({ conversationId, name }) => {
      void publishTypingUpdate(userId, conversationId, name, true);
    });
    socket.on("typing:stop", ({ conversationId, name }) => {
      void publishTypingUpdate(userId, conversationId, name, false);
    });
    socket.on("messages:read", async ({ conversationId }) => {
      if (!conversationId || !userId) return;
      try {
        await connectToDB();
        const reader = await User.findOne({ firebaseId: userId }).select("_id").lean() as unknown as { _id: string } | null;
        if (!reader) return;
        const conversation = await Conversation.findOne({ _id: conversationId, participants: reader._id })
          .populate("participants", "firebaseId")
          .lean() as unknown as { participants: Array<{ firebaseId: string }> } | null;
        if (!conversation) return;
        for (const participant of conversation.participants) {
          if (participant.firebaseId !== userId) {
            io.to(`user:${participant.firebaseId}`).emit("messages:read", { conversationId, userId });
          }
        }
      } catch (error) {
        console.error("Read receipt publication failed", error);
      }
    });
    socket.on("disconnect", () => {
      if (userId) socket.broadcast.emit("presence:update", { userId, online: false });
    });
  });

  return async () => {
    io.removeAllListeners();
    await closeRedis?.();
  };
}
