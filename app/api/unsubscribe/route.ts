import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import User from "@/models/user";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";
import { resolveSettings } from "@/lib/notification-policy";

export const maxDuration = 5;

/**
 * One-click unsubscribe (RFC 8058): mail clients POST here from the
 * List-Unsubscribe header, and the /unsubscribe page posts here on tap.
 * Turns off that category's email only.
 */
export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ||
    (await req.formData().catch(() => null))?.get("token");
  const verified = verifyUnsubscribeToken(token);
  if (!verified) return NextResponse.json({ error: "This link is invalid or expired." }, { status: 400 });

  await connectToDB();
  const user = await User.findById(verified.userId).select("preferences notificationSettings");
  if (!user) return NextResponse.json({ ok: true });
  const settings = resolveSettings(user.toObject() as Parameters<typeof resolveSettings>[0]);
  settings.email[verified.category] = false;
  user.notificationSettings = settings as unknown as Record<string, unknown>;
  user.markModified("notificationSettings");
  await user.save();
  return NextResponse.json({ ok: true, category: verified.category });
}
