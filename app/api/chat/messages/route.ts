import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import Conversation from "@/models/conversation";
import Message from "@/models/message";
import User from "@/models/user";

async function participant(firebaseId: string, conversationId: string) {
  const user = await User.findOne({ firebaseId }).select("_id");
  if (!user) return null;
  const conversation = await Conversation.findOne({ _id: conversationId, participants: user._id });
  return conversation ? { user, conversation } : null;
}

export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const userId = req.nextUrl.searchParams.get("userId") || "";
    const conversationId = req.nextUrl.searchParams.get("conversationId") || "";
    const access = await participant(userId, conversationId);
    if (!access) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    const messages = await Message.find({ conversation: conversationId }).sort({ createdAt: -1 }).limit(200)
      .populate("sender", "name username image firebaseId").lean();
    messages.reverse();
    return NextResponse.json(
      { messages },
      { headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30" } }
    );
  } catch (error) {
    console.error("Message lookup failed", error);
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await connectToDB();
    const { userId, conversationId } = await req.json();
    const access = await participant(String(userId || ""), String(conversationId || ""));
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
    await connectToDB();
    const { userId, conversationId, text } = await req.json();
    const cleanText = String(text || "").trim().slice(0, 2000);
    const access = await participant(userId, conversationId);
    if (!access || !cleanText) return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    const message = await Message.create({ conversation: conversationId, sender: access.user._id, text: cleanText, readBy: [access.user._id] });
    access.conversation.lastMessage = message._id;
    access.conversation.lastMessageAt = message.createdAt;
    await access.conversation.save();
    await message.populate("sender", "name username image firebaseId");
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Message send failed", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
