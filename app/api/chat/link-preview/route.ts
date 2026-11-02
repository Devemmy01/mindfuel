import { NextRequest, NextResponse } from "next/server";
import { requireFirebaseUser } from "@/lib/firebase-admin";
import { fetchLinkPreview } from "@/lib/link-preview";

export const runtime = "nodejs";
export const maxDuration = 10;

/**
 * GET ?url=: title and description for a link the sender chose to preview.
 * Opt-in per message; the URL is neither logged nor stored. The preview then
 * travels inside the encrypted message.
 */
export async function GET(req: NextRequest) {
  const auth = await requireFirebaseUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = req.nextUrl.searchParams.get("url") || "";
  if (url.length > 2048) return NextResponse.json({ error: "Invalid link" }, { status: 400 });
  const preview = await fetchLinkPreview(url).catch(() => null);
  return NextResponse.json({ preview }, { headers: { "Cache-Control": "private, no-store" } });
}
