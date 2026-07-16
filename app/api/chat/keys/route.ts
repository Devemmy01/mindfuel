import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import User from "@/models/user";
import Conversation from "@/models/conversation";
import { requireFirebaseUser } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  const auth = await requireFirebaseUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { publicKey } = await req.json();
    if (typeof publicKey !== "string" || publicKey.length < 300 || publicKey.length > 1000) {
      return NextResponse.json({ error: "Invalid public key" }, { status: 400 });
    }
    await connectToDB();
    const user = await User.findOneAndUpdate(
      { firebaseId: auth.uid, $or: [{ chatPublicKey: "" }, { chatPublicKey: { $exists: false } }] },
      { $set: { chatPublicKey: publicKey } },
      { new: true },
    ).select("+chatPublicKey");
    if (!user) {
      const existing = await User.findOne({ firebaseId: auth.uid }).select("+chatPublicKey");
      if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });
      if (existing.chatPublicKey !== publicKey) {
        const hasEncryptedConversations = await Conversation.exists({
          participants: existing._id,
          encryptionVersion: 1,
        });
        if (hasEncryptedConversations) {
          return NextResponse.json({ error: "This device is not linked to the account's encrypted chats" }, { status: 409 });
        }
        existing.chatPublicKey = publicKey;
        await existing.save();
      }
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unable to register encryption key" }, { status: 500 });
  }
}
