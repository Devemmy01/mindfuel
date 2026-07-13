import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import Conversation from "@/models/conversation";
import ChatTypingState from "@/models/chatTypingState";
import User from "@/models/user";

const TYPING_TTL_MS = 4_000;

async function getParticipant(firebaseId: string, conversationId: string) {
  const user = await User.findOne({ firebaseId }).select("_id name firebaseId");
  if (!user) return null;
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: user._id,
  }).select("_id");
  return conversation ? { user, conversation } : null;
}

export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const userId = req.nextUrl.searchParams.get("userId") || "";
    const conversationId = req.nextUrl.searchParams.get("conversationId") || "";
    const access = await getParticipant(userId, conversationId);
    if (!access) {
      return NextResponse.json({ typing: [] }, { status: 404 });
    }

    const states = await ChatTypingState.find({
      conversation: access.conversation._id,
      user: { $ne: access.user._id },
      expiresAt: { $gt: new Date() },
    })
      .populate("user", "name firebaseId")
      .lean();

    return NextResponse.json(
      {
        typing: states.map((state) => ({
          userId: state.user.firebaseId,
          name: state.user.name,
        })),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("Typing state lookup failed", error);
    return NextResponse.json({ error: "Failed to load typing state" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDB();
    const { userId, conversationId, isTyping } = await req.json();
    const access = await getParticipant(String(userId || ""), String(conversationId || ""));
    if (!access) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    if (isTyping) {
      await ChatTypingState.findOneAndUpdate(
        { conversation: access.conversation._id, user: access.user._id },
        {
          $set: {
            conversation: access.conversation._id,
            user: access.user._id,
            expiresAt: new Date(Date.now() + TYPING_TTL_MS),
          },
        },
        { upsert: true, new: true },
      );
    } else {
      await ChatTypingState.deleteOne({
        conversation: access.conversation._id,
        user: access.user._id,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Typing state update failed", error);
    return NextResponse.json({ error: "Failed to update typing state" }, { status: 500 });
  }
}
