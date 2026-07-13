import { NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import User from "@/models/user";

export const maxDuration = 5;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { subscription, deviceId } = body;
    const userId = body.userId || body.firebaseId;

    if (!subscription || !userId) {
      return NextResponse.json({ error: "Subscription and User ID are required" }, { status: 400 });
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
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
