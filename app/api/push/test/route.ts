import { NextRequest, NextResponse } from "next/server";
import { getViewerUid, unauthorized } from "@/lib/api-auth";
import { connectToDB } from "@/utils/database";
import User from "@/models/user";
import { sendPushNotifications, type StoredPushSubscription } from "@/lib/sendPushNotifications";
import { absoluteUrl } from "@/lib/links";
import { testPushEnabled } from "@/lib/push-test";

/** Staging-only: send a test push to the caller's own devices. */

export const maxDuration = 10;

export async function POST(req: NextRequest) {
  if (!testPushEnabled()) return NextResponse.json({ error: "Not available" }, { status: 404 });
  const uid = await getViewerUid(req);
  if (!uid) return unauthorized();
  await connectToDB();
  const user = await User.findOne({ firebaseId: uid }).select("pushSubscriptions").lean() as
    { _id: unknown; pushSubscriptions?: StoredPushSubscription[] } | null;
  if (!user?.pushSubscriptions?.length) {
    return NextResponse.json({ error: "This account has no devices with notifications on." }, { status: 400 });
  }
  const url = absoluteUrl("/settings/notifications?source=test-push");
  const result = await sendPushNotifications({
    recipientId: user._id,
    subscriptions: user.pushSubscriptions,
    payload: JSON.stringify({
      title: "Test notification",
      body: "Notifications work on this device.",
      tag: "test",
      url,
      data: { url, category: "product", type: "test" },
    }),
  });
  return NextResponse.json({ sent: result.sent });
}
