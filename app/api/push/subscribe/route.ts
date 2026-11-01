import { NextRequest, NextResponse } from "next/server";
import { getViewerUid, unauthorized } from "@/lib/api-auth";
import { connectToDB } from "@/utils/database";
import User from "@/models/user";

export const maxDuration = 5;

export async function POST(req: NextRequest) {
  try {
    const userId = await getViewerUid(req);
    if (!userId) return unauthorized();
    const { subscription, deviceId } = await req.json();

    if (!subscription) {
      return NextResponse.json({ error: "Subscription is required" }, { status: 400 });
    }

    await connectToDB();

    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json({ error: "Invalid push subscription" }, { status: 400 });
    }

    const user = await User.findOne({ firebaseId: userId });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Mongoose gives array subdocuments their own _id, so $addToSet can retain
    // several records with the same endpoint. Normalize by endpoint and replace
    // any prior subscription belonging to this browser installation.
    const unique = new Map<string, (typeof user.pushSubscriptions)[number]>();
    for (const existing of user.pushSubscriptions || []) {
      if (
        existing.endpoint &&
        existing.endpoint !== subscription.endpoint &&
        (!deviceId || existing.deviceId !== deviceId)
      ) {
        unique.set(existing.endpoint, existing);
      }
    }
    unique.set(subscription.endpoint, {
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      ...(deviceId ? { deviceId: String(deviceId) } : {}),
    });
    user.pushSubscriptions = [...unique.values()];
    user.preferences.notifications = true;
    await user.save();

    return NextResponse.json({
      success: true,
      message: "Subscribed successfully",
      subscriptionCount: user.pushSubscriptions.length,
    });
  } catch (error: unknown) {
    console.error("Push subscription error:", error);
    return NextResponse.json({ error: "Could not save this device for notifications" }, { status: 500 });
  }
}
