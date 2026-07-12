import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import Conversation from "@/models/conversation";
import Message from "@/models/message";
import User from "@/models/user";

export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const firebaseId = req.nextUrl.searchParams.get("userId");
    if (!firebaseId) return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    const user = await User.findOne({ firebaseId }).select("_id");
    if (!user) return NextResponse.json({ conversations: [] });
    const conversations = await Conversation.find({ participants: user._id })
      .sort({ lastMessageAt: -1 })
      .limit(50)
      .populate("participants", "name username image firebaseId")
      .populate({
        path: "lastMessage",
        select: "text createdAt sender readBy",
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
      { headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=20" } }
    );
  } catch (error) {
    console.error("Conversation lookup failed", error);
    return NextResponse.json({ error: "Failed to load conversations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDB();
    const { userId, recipientId } = await req.json();
    if (!userId || !recipientId || userId === recipientId) return NextResponse.json({ error: "Invalid participants" }, { status: 400 });
    const users = await User.find({ firebaseId: { $in: [userId, recipientId] } }).select("_id firebaseId");
    if (users.length !== 2) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const participantIds = users.map((user) => String(user._id)).sort();
    const conversation = await Conversation.findOneAndUpdate(
      { participantKey: participantIds.join(":") },
      { $setOnInsert: { participants: participantIds, participantKey: participantIds.join(":"), lastMessageAt: new Date() } },
      { upsert: true, new: true }
    )
      .populate("participants", "name username image firebaseId")
      .populate({
        path: "lastMessage",
        select: "text createdAt sender readBy",
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
