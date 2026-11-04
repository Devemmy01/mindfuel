import { NextRequest, NextResponse } from "next/server";
import { blockedUserIds, isBlockedBetween } from "@/lib/blocks";
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
      declinedBy: { $ne: user._id },
      $or: [
        { lastMessage: { $exists: true, $ne: null } },
        { visibleTo: user._id },
      ],
    })
      .sort({ lastMessageAt: -1 })
      .limit(50)
      .populate("participants", "+chatPublicKey name username image firebaseId")
      .populate("encryptedKeys.user", "firebaseId")
      .populate("previousKeys.encryptedKeys.user", "firebaseId")
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
    const blocked = await blockedUserIds(user._id);
    const withUnread = conversations.map((conversation) => ({
      ...conversation,
      unreadCount: unreadByConversation.get(String(conversation._id)) || 0,
      muted: (conversation.mutedBy || []).some((id: unknown) => String(id) === String(user._id)),
      request: (conversation.requestFor || []).some((id: unknown) => String(id) === String(user._id)),
      requestFor: undefined,
      declinedBy: undefined,
      blocked: conversation.participants.some((participant: { _id: unknown }) => blocked.has(String(participant._id))),
      mutedBy: undefined,
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
    const recipient = users.find((user) => user.firebaseId === recipientId);
    if (recipient && await isBlockedBetween(currentUser._id, recipient._id)) {
      return NextResponse.json({ error: "You can't message this person.", code: "blocked" }, { status: 403 });
    }
    const conversation = await Conversation.findOneAndUpdate(
      { participantKey: participantIds.join(":") },
      {
        $setOnInsert: { participants: participantIds, participantKey: participantIds.join(":"), lastMessageAt: new Date() },
        $addToSet: { visibleTo: currentUser._id },
        // Starting a conversation yourself undoes an earlier "delete request".
        $pull: { declinedBy: currentUser._id },
      },
      { upsert: true, new: true }
    )
      .populate("participants", "+chatPublicKey name username image firebaseId")
      .populate("encryptedKeys.user", "firebaseId")
      .populate("previousKeys.encryptedKeys.user", "firebaseId")
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
    const participants = await User.find({ _id: { $in: conversation.participants } }).select("+chatPublicKey firebaseId");
    const byFirebaseId = new Map(participants.map((row) => [row.firebaseId, row]));
    type WrappedKeyRow = { userId?: string; wrappedKey?: string; publicKey?: string };
    if (wrappedKeys.length !== participants.length || wrappedKeys.some((row: WrappedKeyRow) =>
      !byFirebaseId.has(String(row.userId || "")) || typeof row.wrappedKey !== "string" || row.wrappedKey.length > 1000)) {
      return NextResponse.json({ error: "Invalid wrapped keys" }, { status: 400 });
    }
    // Each key must be wrapped for the identity that person's account has
    // registered. A browser that isn't linked to the account wraps its own
    // copy for a throwaway identity; accepting that would replace the
    // conversation key and leave every linked device (and the other person)
    // unable to read anything sent afterwards.
    for (const row of wrappedKeys as WrappedKeyRow[]) {
      const participant = byFirebaseId.get(String(row.userId));
      if (!participant?.chatPublicKey || row.publicKey !== participant.chatPublicKey) {
        const self = row.userId === auth.uid;
        return NextResponse.json(
          {
            error: self
              ? "This device is not linked to your encrypted chats"
              : "This person's encryption key changed. Reload and try again.",
            code: self ? "device_not_linked" : "stale_recipient_key",
          },
          { status: 409 },
        );
      }
    }
    // Reached on first setup, and again when a participant reset their
    // identity and can no longer unwrap the current key. Messages are never
    // re-encrypted, so the old key set is kept: dropping it would make every
    // earlier message unreadable for everyone.
    if (conversation.encryptedKeys?.length) {
      conversation.previousKeys = [
        { encryptedKeys: conversation.encryptedKeys, retiredAt: new Date() },
        ...(conversation.previousKeys || []),
      ].slice(0, 20);
    }
    conversation.encryptionVersion = conversation.encryptionVersion || 1;
    conversation.encryptedKeys = (wrappedKeys as WrappedKeyRow[]).map((row) => ({
      user: byFirebaseId.get(String(row.userId))!._id, wrappedKey: String(row.wrappedKey),
    }));
    await conversation.save();
    await conversation.populate([
      { path: "encryptedKeys.user", select: "firebaseId" },
      { path: "previousKeys.encryptedKeys.user", select: "firebaseId" },
    ]);
    return NextResponse.json({
      encryptionVersion: conversation.encryptionVersion,
      encryptedKeys: conversation.encryptedKeys,
      previousKeys: conversation.previousKeys,
    });
  } catch (error) {
    console.error("Conversation encryption setup failed", error);
    return NextResponse.json({ error: "Failed to enable encryption" }, { status: 500 });
  }
}
