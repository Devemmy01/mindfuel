import { NextRequest, NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectToDB } from "@/utils/database";
import Conversation from "@/models/conversation";
import User from "@/models/user";
import ChatAttachment from "@/models/chatAttachment";
import cloudinary from "@/lib/cloudinary";
import { requireFirebaseUser } from "@/lib/firebase-admin";
import { isBlockedBetween } from "@/lib/blocks";
import { ATTACHMENT_MAX_UPLOAD_BYTES } from "@/lib/chat-attachments";

export const maxDuration = 15;

const UPLOADS_PER_WINDOW = 20;
const WINDOW_MS = 10 * 60 * 1000;

function uploadCiphertext(bytes: Buffer) {
  return new Promise<{ public_id: string; bytes: number }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      // Raw + authenticated: unsigned URLs are refused; reads go through signed, expiring links.
      { resource_type: "raw", type: "authenticated", folder: "mindfuel_chat" },
      (error, result) => (error || !result ? reject(error || new Error("Upload failed")) : resolve(result)),
    );
    stream.end(bytes);
  });
}

/** POST ?conversationId= with the encrypted photo as the raw body. Returns { id }. */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireFirebaseUser(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const conversationId = req.nextUrl.searchParams.get("conversationId") || "";
    if (!isValidObjectId(conversationId)) return NextResponse.json({ error: "Invalid conversation" }, { status: 400 });
    const declared = Number(req.headers.get("content-length") || 0);
    if (declared > ATTACHMENT_MAX_UPLOAD_BYTES) return NextResponse.json({ error: "That photo is too large." }, { status: 413 });

    await connectToDB();
    const user = await User.findOne({ firebaseId: auth.uid }).select("_id");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const conversation = await Conversation.findOne({ _id: conversationId, participants: user._id }).select("participants");
    if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    for (const other of conversation.participants) {
      if (String(other) !== String(user._id) && await isBlockedBetween(user._id, other)) {
        return NextResponse.json({ error: "You can't message this person.", code: "blocked" }, { status: 403 });
      }
    }
    const recent = await ChatAttachment.countDocuments({ uploader: user._id, createdAt: { $gt: new Date(Date.now() - WINDOW_MS) } });
    if (recent >= UPLOADS_PER_WINDOW) return NextResponse.json({ error: "You're sending photos too quickly. Try again in a few minutes." }, { status: 429 });

    const bytes = Buffer.from(await req.arrayBuffer());
    if (bytes.length === 0) return NextResponse.json({ error: "Empty upload" }, { status: 400 });
    if (bytes.length > ATTACHMENT_MAX_UPLOAD_BYTES) return NextResponse.json({ error: "That photo is too large." }, { status: 413 });

    const stored = await uploadCiphertext(bytes);
    const attachment = await ChatAttachment.create({
      conversation: conversation._id,
      uploader: user._id,
      publicId: stored.public_id,
      size: bytes.length,
    });
    return NextResponse.json({ id: String(attachment._id) }, { status: 201 });
  } catch (error) {
    console.error("Attachment upload failed", error);
    return NextResponse.json({ error: "Couldn't upload that photo." }, { status: 500 });
  }
}
