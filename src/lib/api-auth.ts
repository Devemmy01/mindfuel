import { NextRequest, NextResponse } from "next/server";
import { requireFirebaseUser } from "@/lib/firebase-admin";

/**
 * Identity for API routes always comes from a verified Firebase ID token.
 * Client-supplied ids (body `userId`, `firebaseId`, `currentUserId`, ...) are
 * never trusted to decide who the caller is.
 */
export async function getViewerUid(req: NextRequest): Promise<string | null> {
  const decoded = await requireFirebaseUser(req);
  return decoded?.uid ?? null;
}

export function unauthorized() {
  return NextResponse.json({ error: "Sign in to continue" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Not allowed" }, { status: 403 });
}

/** Response headers for payloads that depend on who is asking. */
export function viewerCacheHeaders(viewerUid: string | null, publicValue: string) {
  return { "Cache-Control": viewerUid ? "private, no-store" : publicValue };
}

/**
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when the variable is
 * set. The user-agent is not proof of origin, so it is never accepted alone.
 * Without a configured secret, cron routes only run in development.
 */
export function isCronAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV === "development";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}
