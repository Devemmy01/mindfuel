import { NextRequest, NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectToDB } from "@/utils/database";
import Conversation from "@/models/conversation";
import User from "@/models/user";
import { requireFirebaseUser } from "@/lib/firebase-admin";

/**
 * POST { conversationId, action }: "accept" moves a message request into
 * Chats; "decline" removes it for the viewer. The sender isn't told either way.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireFirebaseUser(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectToDB();
    const { conversationId, action } = await req.json().catch(() => ({}));
    if (!isValidObjectId(conversationId) || (action !== "accept" && action !== "decline")) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const user = await User.findOne({ firebaseId: auth.uid }).select("_id");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const update = action === "accept"
      ? { $pull: { requestFor: user._id, declinedBy: user._id } }
      : { $pull: { requestFor: user._id, visibleTo: user._id }, $addToSet: { declinedBy: user._id } };
    const result = await Conversation.updateOne({ _id: conversationId, participants: user._id }, update);
    if (!result.matchedCount) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    return NextResponse.json({ success: true, action });
  } catch (error) {
    console.error("Message request update failed", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
