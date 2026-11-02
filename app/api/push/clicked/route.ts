import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import { recordStat } from "@/lib/notify";
import { CATEGORIES } from "@/lib/notification-policy";

export const maxDuration = 5;

/** Counts a notification tap for open-rate stats. Category only; no user data. */
export async function POST(req: NextRequest) {
  const { category } = await req.json().catch(() => ({}));
  if (!(CATEGORIES as readonly string[]).includes(category)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  await connectToDB();
  await recordStat(category, "push", "clicked");
  return NextResponse.json({ ok: true });
}
