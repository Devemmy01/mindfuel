import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import Conversation from "@/models/conversation";
import Message from "@/models/message";
import User from "@/models/user";
import { sendPushNotifications, StoredPushSubscription } from "@/lib/sendPushNotifications";
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
    const messages = await Message.find({ conversation: conversationId }).sort({ createdAt: -1 }).limit(200)
      .populate("sender", "name username image firebaseId")
      .populate("reactions.users", "firebaseId")
      .populate({
        path: "replyTo",
        select: "text ciphertext iv encryptionVersion sender createdAt",
        populate: { path: "sender", select: "name username image firebaseId" },
      })
      .lean();
    messages.reverse();
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
    const { conversationId, ciphertext, iv, encryptionVersion, replyTo } = await req.json();
    const access = await participant(auth.uid, conversationId);
    const encrypted = encryptionVersion === 1 && typeof ciphertext === "string" && typeof iv === "string";
    if (!access || !encrypted || !access.conversation.encryptionVersion) return NextResponse.json({ error: "Invalid encrypted message" }, { status: 400 });
    if (ciphertext.length > 12000 || iv.length > 64) return NextResponse.json({ error: "Message is too large" }, { status: 400 });
    if (replyTo && !isValidObjectId(replyTo)) {
      return NextResponse.json({ error: "Invalid reply message" }, { status: 400 });
    }
    const replyMessage = replyTo
      ? await Message.findOne({ _id: replyTo, conversation: conversationId }).select("_id")
      : null;
    if (replyTo && !replyMessage) {
      return NextResponse.json({ error: "Reply message not found" }, { status: 400 });
    }
    const message = await Message.create({
      conversation: conversationId,
      sender: access.user._id,
      ciphertext,
      iv,
      encryptionVersion: 1,
      readBy: [access.user._id],
      replyTo: replyMessage?._id,
    });
    access.conversation.lastMessage = message._id;
    access.conversation.lastMessageAt = message.createdAt;
    await access.conversation.save();
    await message.populate([
      { path: "sender", select: "name username image firebaseId" },
      {
        path: "replyTo",
        select: "text ciphertext iv encryptionVersion sender createdAt",
        populate: { path: "sender", select: "name username image firebaseId" },
      },
    ]);

    // Push is tied to the durable HTTP write, not the best-effort socket event.
    // The service worker suppresses this notification while a visible app tab
    // is open, leaving the in-app toast as the foreground experience.
    const recipients = await User.find({
      _id: { $in: access.conversation.participants, $ne: access.user._id },
      "preferences.notifications": { $ne: false },
      pushSubscriptions: { $exists: true, $ne: [] },
    }).select("pushSubscriptions");
    const senderName = String(access.user.name || "Someone");
    const firstName = senderName.trim().split(/\s+/)[0] || "Someone";
    const senderImage = String(access.user.image || "");
    const pushIcon = senderImage.startsWith("http")
      ? senderImage
      : senderImage.startsWith("/")
        ? `${APP_URL}${senderImage}`
        : `${APP_URL}/icon-192.png`;
    const payload = JSON.stringify({
      title: `New message from ${firstName}`,
      body: "Open MindFuel to read it",
      icon: pushIcon,
      badge: `${APP_URL}/icon-192.png`,
      tag: `conversation-${conversationId}`,
      url: `${APP_URL}/messages?with=${encodeURIComponent(access.user.firebaseId)}`,
      data: { url: `${APP_URL}/messages?with=${encodeURIComponent(access.user.firebaseId)}`, type: "message" },
    });
    await Promise.allSettled(
      recipients.map((recipient) =>
        sendPushNotifications({
          recipientId: recipient._id,
          subscriptions: recipient.pushSubscriptions as unknown as StoredPushSubscription[],
          payload,
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
