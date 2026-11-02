import { NextRequest, NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectToDB } from "@/utils/database";
import Conversation from "@/models/conversation";
import User from "@/models/user";
import ChatAttachment from "@/models/chatAttachment";
import cloudinary from "@/lib/cloudinary";
import { requireFirebaseUser } from "@/lib/firebase-admin";

export const maxDuration = 15;

/** GET: the encrypted bytes, for participants of the attachment's conversation only. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireFirebaseUser(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    if (!isValidObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await connectToDB();
    const [user, attachment] = await Promise.all([
      User.findOne({ firebaseId: auth.uid }).select("_id"),
      ChatAttachment.findById(id).select("conversation publicId").lean() as Promise<{ conversation: unknown; publicId: string } | null>,
    ]);
    // The same answer for "doesn't exist" and "not yours".
    if (!user || !attachment) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const member = await Conversation.exists({ _id: attachment.conversation, participants: user._id });
    if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const url = cloudinary.utils.private_download_url(attachment.publicId, "", {
      resource_type: "raw",
      type: "authenticated",
      expires_at: Math.floor(Date.now() / 1000) + 60,
    });
    const upstream = await fetch(url);
    if (!upstream.ok || !upstream.body) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "application/octet-stream",
        // Ciphertext, and the URL is per attachment: safe to keep in this browser only.
        "Cache-Control": "private, max-age=86400, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Attachment download failed", error);
    return NextResponse.json({ error: "Couldn't load that photo." }, { status: 500 });
  }
}
