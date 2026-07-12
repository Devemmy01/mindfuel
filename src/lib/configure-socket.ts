import type { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import { connectToDB } from "@/utils/database";
import Conversation from "@/models/conversation";
import Message from "@/models/message";
import User from "@/models/user";
import webpush from "@/lib/push";
import type { PushSubscription } from "web-push";

const APP_URL = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || "https://mind-fuel.app";

export function configureSocketServer(io: Server) {
  let closeRedis: (() => Promise<void>) | undefined;

  if (process.env.REDIS_URL) {
    const publisher = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
    const subscriber = publisher.duplicate();
    publisher.on("error", (error) => console.error("Redis publisher error", error.message));
    subscriber.on("error", (error) => console.error("Redis subscriber error", error.message));
    io.adapter(createAdapter(publisher, subscriber));
    closeRedis = async () => {
      await Promise.allSettled([publisher.quit(), subscriber.quit()]);
    };
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
      if (!conversationId || !message?._id || !userId || !socket.rooms.has(`conversation:${conversationId}`)) return;
      try {
        await connectToDB();
        const sender = await User.findOne({ firebaseId: userId }).select("_id").lean() as unknown as { _id: string } | null;
        if (!sender) return;
        const [conversation, storedMessage] = await Promise.all([
          Conversation.findOne({ _id: conversationId, participants: sender._id })
            .populate("participants", "name username image firebaseId preferences pushSubscriptions")
            .lean(),
          Message.findOne({ _id: message._id, conversation: conversationId, sender: sender._id })
            .populate("sender", "name username image firebaseId")
            .lean(),
        ]) as unknown as [
          { participants: Array<{ firebaseId: string; preferences?: { notifications?: boolean }; pushSubscriptions?: PushSubscription[] }> } | null,
          { sender?: { name?: string; image?: string }; text?: string } & Record<string, unknown> | null,
        ];
        if (!conversation || !storedMessage) return;
        for (const participant of conversation.participants) {
          if (participant.firebaseId !== userId) {
            const recipientRoom = `user:${participant.firebaseId}`;
            const connectedRecipients = await io.in(recipientRoom).fetchSockets();
            io.to(recipientRoom).emit("conversation:message", {
              conversationId,
              conversation,
              message: storedMessage,
            });
            if (
              connectedRecipients.length === 0 &&
              participant.preferences?.notifications !== false &&
              participant.pushSubscriptions?.length
            ) {
              const payload = JSON.stringify({
                title: storedMessage.sender?.name || "New message",
                body: storedMessage.text || "Sent you a message",
                icon: storedMessage.sender?.image || `${APP_URL}/icon-192.png`,
                badge: `${APP_URL}/icon-192.png`,
                url: `${APP_URL}/messages?with=${encodeURIComponent(userId)}`,
              });
              await Promise.allSettled(
                participant.pushSubscriptions.map((subscription) =>
                  webpush.sendNotification(subscription, payload),
                ),
              );
            }
          }
        }
      } catch (error) {
        console.error("Message publication failed", error);
      }
    });
    socket.on("typing:start", ({ conversationId, name }) => {
      if (socket.rooms.has(`conversation:${conversationId}`)) {
        socket.to(`conversation:${conversationId}`).emit("typing:update", { userId, name, isTyping: true });
      }
    });
    socket.on("typing:stop", ({ conversationId, name }) => {
      if (socket.rooms.has(`conversation:${conversationId}`)) {
        socket.to(`conversation:${conversationId}`).emit("typing:update", { userId, name, isTyping: false });
      }
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
