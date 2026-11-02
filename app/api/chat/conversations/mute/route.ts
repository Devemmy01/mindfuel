import { NextRequest, NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectToDB } from "@/utils/database";
import Conversation from "@/models/conversation";
import User from "@/models/user";
import { requireFirebaseUser } from "@/lib/firebase-admin";

/** POST { conversationId, muted }: mute or unmute message notifications for one conversation. */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireFirebaseUser(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectToDB();
    const { conversationId, muted } = await req.json().catch(() => ({}));
    if (!isValidObjectId(conversationId) || typeof muted !== "boolean") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const user = await User.findOne({ firebaseId: auth.uid }).select("_id");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const result = await Conversation.updateOne(
      { _id: conversationId, participants: user._id },
      muted ? { $addToSet: { mutedBy: user._id } } : { $pull: { mutedBy: user._id } },
    );
    if (!result.matchedCount) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    return NextResponse.json({ muted });
  } catch (error) {
    console.error("Conversation mute failed", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
