import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import Conversation from "@/models/conversation";
import Message from "@/models/message";
import User from "@/models/user";
import { requireFirebaseUser } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireFirebaseUser(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectToDB();
    const user = await User.findOne({ firebaseId: auth.uid }).select("_id");
    if (!user) return NextResponse.json({ conversations: [] });
    const conversations = await Conversation.find({
      participants: user._id,
      $or: [
        { lastMessage: { $exists: true, $ne: null } },
        { visibleTo: user._id },
      ],
    })
      .sort({ lastMessageAt: -1 })
      .limit(50)
      .populate("participants", "+chatPublicKey name username image firebaseId")
      .populate("encryptedKeys.user", "firebaseId")
      .populate({
        path: "lastMessage",
        select: "text ciphertext iv encryptionVersion createdAt sender readBy reactions",
        populate: {
          path: "sender",
          select: "name username image firebaseId",
        },
      })
      .lean();
    const conversationIds = conversations.map((conversation) => conversation._id);
    const unreadRows = conversationIds.length ? await Message.aggregate<{ _id: string; count: number }>([
      { $match: { conversation: { $in: conversationIds }, sender: { $ne: user._id }, readBy: { $ne: user._id } } },
      { $group: { _id: "$conversation", count: { $sum: 1 } } },
    ]) : [];
    const unreadByConversation = new Map(unreadRows.map((row) => [String(row._id), row.count]));
    const withUnread = conversations.map((conversation) => ({
      ...conversation,
      unreadCount: unreadByConversation.get(String(conversation._id)) || 0,
    }));
    return NextResponse.json(
      { conversations: withUnread },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("Conversation lookup failed", error);
    return NextResponse.json({ error: "Failed to load conversations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireFirebaseUser(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectToDB();
    const { recipientId } = await req.json();
    if (!recipientId || auth.uid === recipientId) return NextResponse.json({ error: "Invalid participants" }, { status: 400 });
    const users = await User.find({ firebaseId: { $in: [auth.uid, recipientId] } }).select("+chatPublicKey _id firebaseId");
    if (users.length !== 2) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const participantIds = users.map((user) => String(user._id)).sort();
    const currentUser = users.find((user) => user.firebaseId === auth.uid);
    if (!currentUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const conversation = await Conversation.findOneAndUpdate(
      { participantKey: participantIds.join(":") },
      {
        $setOnInsert: { participants: participantIds, participantKey: participantIds.join(":"), lastMessageAt: new Date() },
        $addToSet: { visibleTo: currentUser._id },
      },
      { upsert: true, new: true }
    )
      .populate("participants", "+chatPublicKey name username image firebaseId")
      .populate("encryptedKeys.user", "firebaseId")
      .populate({
        path: "lastMessage",
        select: "text ciphertext iv encryptionVersion createdAt sender readBy reactions",
        populate: {
          path: "sender",
          select: "name username image firebaseId",
        },
      });
    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    console.error("Conversation creation failed", error);
    return NextResponse.json({ error: "Failed to start conversation" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireFirebaseUser(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectToDB();
    const { conversationId, wrappedKeys } = await req.json();
    const user = await User.findOne({ firebaseId: auth.uid }).select("_id");
    if (!user || !Array.isArray(wrappedKeys)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const conversation = await Conversation.findOne({ _id: conversationId, participants: user._id });
    if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    const participants = await User.find({ _id: { $in: conversation.participants } }).select("firebaseId");
    const byFirebaseId = new Map(participants.map((row) => [row.firebaseId, row._id]));
    if (wrappedKeys.length !== participants.length || wrappedKeys.some((row: { userId?: string; wrappedKey?: string }) =>
      !byFirebaseId.has(String(row.userId || "")) || typeof row.wrappedKey !== "string" || row.wrappedKey.length > 1000)) {
      return NextResponse.json({ error: "Invalid wrapped keys" }, { status: 400 });
    }
    if (!conversation.encryptionVersion) {
      conversation.encryptionVersion = 1;
      conversation.encryptedKeys = wrappedKeys.map((row: { userId: string; wrappedKey: string }) => ({
        user: byFirebaseId.get(row.userId), wrappedKey: row.wrappedKey,
      }));
      await conversation.save();
    }
    await conversation.populate("encryptedKeys.user", "firebaseId");
    return NextResponse.json({ encryptionVersion: conversation.encryptionVersion, encryptedKeys: conversation.encryptedKeys });
  } catch (error) {
    console.error("Conversation encryption setup failed", error);
    return NextResponse.json({ error: "Failed to enable encryption" }, { status: 500 });
  }
}
