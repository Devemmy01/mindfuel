import { NextRequest, NextResponse } from "next/server";
import { isBlockedBetween } from "@/lib/blocks";
import Follow from "@/models/follow";
import ChatAttachment from "@/models/chatAttachment";
import { destroyAttachments } from "@/lib/chat-attachment-store";
import { connectToDB } from "@/utils/database";
import Conversation from "@/models/conversation";
import Message from "@/models/message";
import User from "@/models/user";
import { sendCategoryPush } from "@/lib/notify";
import { isValidObjectId } from "mongoose";
import { requireFirebaseUser } from "@/lib/firebase-admin";

export const maxDuration = 15;

const APP_URL = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || "https://mind-fuel.app";

async function participant(firebaseId: string, conversationId: string) {
  const user = await User.findOne({ firebaseId }).select("_id name image firebaseId");
  if (!user) return null;
  const conversation = await Conversation.findOne({ _id: conversationId, participants: user._id });
  return conversation ? { user, conversation } : null;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireFirebaseUser(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectToDB();
    const conversationId = req.nextUrl.searchParams.get("conversationId") || "";
    const access = await participant(auth.uid, conversationId);
    if (!access) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    // `after` (ISO time of the newest message the client has) returns only
    // newer messages, for cheap resync after a reconnect.
    const afterParam = req.nextUrl.searchParams.get("after");
    const after = afterParam ? new Date(afterParam) : null;
    const hidden = { hiddenFor: { $ne: access.user._id } };
    const filter = after && !Number.isNaN(after.getTime())
      ? { conversation: conversationId, ...hidden, $or: [{ createdAt: { $gt: after } }, { deletedAt: { $gt: after } }] }
      : { conversation: conversationId, ...hidden };
    const messages = await Message.find(filter).sort({ createdAt: -1 }).limit(200)
      .populate("sender", "name username image firebaseId")
      .populate("reactions.users", "firebaseId")
      .populate({
        path: "replyTo",
        select: "text ciphertext iv encryptionVersion sender createdAt deletedAt",
        populate: { path: "sender", select: "name username image firebaseId" },
      })
      .lean();
    messages.reverse();
    for (const message of messages as Array<Record<string, unknown>>) {
      delete message.hiddenFor;
      if (message.deletedAt) Object.assign(message, { ciphertext: "", iv: "", text: "", reactions: [], replyTo: null });
      const replyTo = message.replyTo as Record<string, unknown> | null;
      if (replyTo?.deletedAt) Object.assign(replyTo, { ciphertext: "", iv: "", text: "" });
    }
    return NextResponse.json(
      { messages },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("Message lookup failed", error);
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireFirebaseUser(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectToDB();
    const { conversationId } = await req.json();
    const access = await participant(auth.uid, String(conversationId || ""));
    if (!access) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    // Reading a pending request isn't announced to the sender.
    if ((access.conversation.requestFor || []).some((id: { toString(): string }) => id.toString() === access.user._id.toString())) {
      return NextResponse.json({ success: true, updatedCount: 0, pendingRequest: true });
    }
    const result = await Message.updateMany(
      { conversation: conversationId, sender: { $ne: access.user._id }, readBy: { $ne: access.user._id } },
      { $addToSet: { readBy: access.user._id } }
    );
    return NextResponse.json({ success: true, updatedCount: result.modifiedCount });
  } catch (error) {
    console.error("Message read update failed", error);
    return NextResponse.json({ error: "Failed to update read status" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireFirebaseUser(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectToDB();
    const { conversationId, ciphertext, iv, encryptionVersion, replyTo, clientMessageId, attachmentId } = await req.json();
    const access = await participant(auth.uid, conversationId);
    // 1: text. 2: an encrypted envelope (e.g. a photo); indistinguishable to the server otherwise.
    const encrypted = (encryptionVersion === 1 || encryptionVersion === 2) && typeof ciphertext === "string" && typeof iv === "string";
    if (!access || !encrypted || !access.conversation.encryptionVersion) return NextResponse.json({ error: "Invalid encrypted message" }, { status: 400 });
    const others = access.conversation.participants.filter((id: { toString(): string }) => id.toString() !== access.user._id.toString());
    for (const other of others) {
      if (await isBlockedBetween(access.user._id, other)) return NextResponse.json({ error: "You can't message this person.", code: "blocked" }, { status: 403 });
    }
    if (ciphertext.length > 12000 || iv.length > 64) return NextResponse.json({ error: "Message is too large" }, { status: 400 });
    if (replyTo && !isValidObjectId(replyTo)) {
      return NextResponse.json({ error: "Invalid reply message" }, { status: 400 });
    }
    const idempotencyKey = typeof clientMessageId === "string" && /^[\w-]{8,64}$/.test(clientMessageId)
      ? clientMessageId
      : undefined;
    const populateMessage = [
      { path: "sender", select: "name username image firebaseId" },
      {
        path: "replyTo",
        select: "text ciphertext iv encryptionVersion sender createdAt",
        populate: { path: "sender", select: "name username image firebaseId" },
      },
    ];
    // A retry of a message that already reached us returns the original.
    if (idempotencyKey) {
      const existing = await Message.findOne({ sender: access.user._id, clientMessageId: idempotencyKey })
        .populate(populateMessage);
      if (existing) return NextResponse.json({ message: existing, duplicate: true }, { status: 200 });
    }
    // Abuse guard: at most 30 messages a minute per sender.
    const recentCount = await Message.countDocuments({
      sender: access.user._id,
      createdAt: { $gt: new Date(Date.now() - 60_000) },
    });
    if (recentCount >= 30) {
      return NextResponse.json({ error: "You're sending messages too quickly. Wait a moment and try again." }, { status: 429 });
    }
    const replyMessage = replyTo
      ? await Message.findOne({ _id: replyTo, conversation: conversationId }).select("_id")
      : null;
    if (replyTo && !replyMessage) {
      return NextResponse.json({ error: "Reply message not found" }, { status: 400 });
    }
    let message;
    try {
      message = await Message.create({
        conversation: conversationId,
        sender: access.user._id,
        ciphertext,
        iv,
        encryptionVersion,
        readBy: [access.user._id],
        replyTo: replyMessage?._id,
        ...(idempotencyKey ? { clientMessageId: idempotencyKey } : {}),
      });
    } catch (error) {
      // Two concurrent retries: the unique index lets one win; return it.
      if ((error as { code?: number })?.code === 11000 && idempotencyKey) {
        const existing = await Message.findOne({ sender: access.user._id, clientMessageId: idempotencyKey })
          .populate(populateMessage);
        if (existing) return NextResponse.json({ message: existing, duplicate: true }, { status: 200 });
      }
      throw error;
    }
    // The server learns only that a message has a photo (it already saw the upload), never what it shows.
    if (attachmentId && isValidObjectId(attachmentId)) {
      await ChatAttachment.updateOne(
        { _id: attachmentId, uploader: access.user._id, conversation: conversationId, message: null },
        { $set: { message: message._id } },
      );
    }
    // Message requests: a first message to someone who doesn't follow the
    // sender waits in their Requests until they accept. Replying accepts.
    const firstMessage = !access.conversation.lastMessage;
    const senderKey = access.user._id.toString();
    const requestFor = new Set((access.conversation.requestFor || []).map((id: { toString(): string }) => id.toString()));
    if (requestFor.has(senderKey)) {
      requestFor.delete(senderKey);
      access.conversation.requestFor = (access.conversation.requestFor || []).filter((id: { toString(): string }) => id.toString() !== senderKey);
    }
    if (firstMessage) {
      for (const other of others) {
        const followsSender = await Follow.exists({ follower: other, following: access.user._id });
        if (!followsSender) {
          requestFor.add(other.toString());
          access.conversation.requestFor = [...(access.conversation.requestFor || []), other];
        }
      }
    }
    access.conversation.lastMessage = message._id;
    access.conversation.lastMessageAt = message.createdAt;
    await access.conversation.save();
    await message.populate(populateMessage);

    // Push is tied to the durable HTTP write, not the best-effort socket event.
    // The service worker suppresses this notification while a visible app tab
    // is open, leaving the in-app toast as the foreground experience.
    // Push never carries message text: only who wrote, and a link to the
    // exact conversation.
    const senderName = String(access.user.name || "Someone");
    const firstName = senderName.trim().split(/\s+/)[0] || "Someone";
    const senderImage = String(access.user.image || "");
    // Muted conversations still deliver in-app; they just don't push.
    // Declined requests never push; pending requests push once, for the first message.
    const muted = new Set([
      ...(access.conversation.mutedBy || []),
      ...(access.conversation.declinedBy || []),
    ].map((id: { toString(): string }) => id.toString()));
    const recipientIds = access.conversation.participants.filter((id: { toString(): string }) => {
      const key = id.toString();
      if (key === senderKey || muted.has(key)) return false;
      return !requestFor.has(key) || firstMessage;
    });
    await Promise.allSettled(
      recipientIds.map((recipientId: unknown) =>
        sendCategoryPush({
          userId: recipientId as string,
          category: "messages",
          payload: {
            title: firstMessage && recipientIds.some((id: { toString(): string }) => requestFor.has(id.toString()))
              ? `Message request from ${firstName}`
              : `New message from ${firstName}`,
            body: "Open MindFuel to read it",
            icon: senderImage.startsWith("http") ? senderImage : undefined,
            tag: `conversation-${conversationId}`,
            url: `${APP_URL}/messages?with=${encodeURIComponent(access.user.firebaseId)}`,
          },
        }),
      ),
    );
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Message send failed", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireFirebaseUser(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectToDB();
    const { conversationId, messageId, emoji } = await req.json();
    const cleanEmoji = typeof emoji === "string" ? emoji.trim() : "";
    if (!cleanEmoji || cleanEmoji.length > 32 || /\s/u.test(cleanEmoji) || !isValidObjectId(messageId)) {
      return NextResponse.json({ error: "Invalid reaction" }, { status: 400 });
    }
    const access = await participant(auth.uid, String(conversationId || ""));
    if (!access) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    const message = await Message.findOne({ _id: messageId, conversation: conversationId });
    if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });
    const userId = access.user._id.toString();
    const selectedReaction = message.reactions?.find((row: { emoji: string }) => row.emoji === cleanEmoji);
    const isRemovingSelection = selectedReaction?.users.some((id: { toString(): string }) => id.toString() === userId);

    // Each participant can have only one reaction on a message. Choosing a
    // different emoji moves their reaction; choosing the same emoji removes it.
    for (const row of message.reactions || []) {
      row.users = row.users.filter((id: { toString(): string }) => id.toString() !== userId);
    }
    if (!isRemovingSelection) {
      const target = message.reactions?.find((row: { emoji: string }) => row.emoji === cleanEmoji);
      if (target) target.users.push(access.user._id);
      else message.reactions.push({ emoji: cleanEmoji, users: [access.user._id] });
    }
    message.reactions = message.reactions.filter((row: { users: unknown[] }) => row.users.length);
    await message.save();
    await message.populate("reactions.users", "firebaseId");
    return NextResponse.json({ messageId, reactions: message.reactions });
  } catch (error) {
    console.error("Message reaction failed", error);
    return NextResponse.json({ error: "Failed to update reaction" }, { status: 500 });
  }
}

/**
 * DELETE { messageId, scope }: "me" hides a message for the viewer only;
 * "everyone" (sender only) erases its content for all, leaving a placeholder,
 * and deletes any stored photo.
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireFirebaseUser(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectToDB();
    const { messageId, scope } = await req.json().catch(() => ({}));
    if (!isValidObjectId(messageId) || (scope !== "me" && scope !== "everyone")) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const message = await Message.findById(messageId).select("conversation sender deletedAt");
    if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });
    const access = await participant(auth.uid, String(message.conversation));
    if (!access) return NextResponse.json({ error: "Message not found" }, { status: 404 });

    if (scope === "me") {
      await Message.updateOne({ _id: messageId }, { $addToSet: { hiddenFor: access.user._id } });
      return NextResponse.json({ success: true, scope });
    }
    if (String(message.sender) !== String(access.user._id)) {
      return NextResponse.json({ error: "You can only delete your own messages for everyone." }, { status: 403 });
    }
    await Message.updateOne(
      { _id: messageId },
      { $set: { deletedAt: new Date(), ciphertext: "", iv: "", text: "", reactions: [] } },
    );
    await destroyAttachments({ message: message._id });
    return NextResponse.json({ success: true, scope });
  } catch (error) {
    console.error("Message delete failed", error);
    return NextResponse.json({ error: "Failed to delete message" }, { status: 500 });
  }
}
