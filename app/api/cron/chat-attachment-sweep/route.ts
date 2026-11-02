import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/api-auth";
import { connectToDB } from "@/utils/database";
import { destroyAttachments } from "@/lib/chat-attachment-store";

export const maxDuration = 30;

const UNSENT_AFTER_MS = 24 * 60 * 60 * 1000;

/** Daily: delete encrypted photo uploads that were never sent in a message. */
export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await connectToDB();
    const result = await destroyAttachments({ message: null, createdAt: { $lt: new Date(Date.now() - UNSENT_AFTER_MS) } });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Attachment sweep failed", error);
    return NextResponse.json({ success: false, error: "Sweep failed" }, { status: 500 });
  }
}
