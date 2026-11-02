import { NextRequest, NextResponse } from "next/server";
import { getViewerUid, unauthorized } from "@/lib/api-auth";
import { connectToDB } from "@/utils/database";
import User from "@/models/user";

export const maxDuration = 5;

export async function POST(req: NextRequest) {
  try {
    const userId = await getViewerUid(req);
    if (!userId) return unauthorized();
    const { subscription, deviceId, platform } = await req.json();

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
    const previous = (user.pushSubscriptions || []).find(
      (existing: { endpoint?: string; deviceId?: string }) =>
        existing.endpoint === subscription.endpoint || (deviceId && existing.deviceId === deviceId),
    ) as { createdAt?: Date } | undefined;
    unique.set(subscription.endpoint, {
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      ...(deviceId ? { deviceId: String(deviceId).slice(0, 64) } : {}),
      userAgent: String(req.headers.get("user-agent") || "").slice(0, 300),
      platform: typeof platform === "string" ? platform.slice(0, 40) : undefined,
      createdAt: previous?.createdAt || new Date(),
      lastSeen: new Date(),
    });
    // A person rarely has more than a few devices; cap stale growth.
    if (unique.size > 10) {
      const oldest = [...unique.entries()].sort(
        (a, b) => new Date((a[1] as { lastSeen?: Date }).lastSeen || 0).getTime() - new Date((b[1] as { lastSeen?: Date }).lastSeen || 0).getTime(),
      )[0];
      unique.delete(oldest[0]);
    }
    user.pushSubscriptions = [...unique.values()];
    // Subscribing is an explicit opt-in, so it lifts the legacy global
    // "notifications off" switch (category choices still apply).
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

/** Remove this device (sign-out, or "Remove" in Settings). */
export async function DELETE(req: NextRequest) {
  try {
    const userId = await getViewerUid(req);
    if (!userId) return unauthorized();
    const { endpoint, deviceId } = await req.json().catch(() => ({}));
    if (!endpoint && !deviceId) {
      return NextResponse.json({ error: "endpoint or deviceId is required" }, { status: 400 });
    }
    await connectToDB();
    const user = await User.findOne({ firebaseId: userId });
    if (!user) return NextResponse.json({ success: true });
    const { createHash } = await import("node:crypto");
    const opaqueId = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 16);
    user.pushSubscriptions = (user.pushSubscriptions || []).filter((existing: { endpoint?: string; deviceId?: string }) => {
      if (endpoint && existing.endpoint === endpoint) return false;
      if (deviceId && (existing.deviceId === deviceId || opaqueId(existing.endpoint || "") === deviceId)) return false;
      return true;
    });
    await user.save();
    return NextResponse.json({ success: true, subscriptionCount: user.pushSubscriptions.length });
  } catch (error) {
    console.error("Push unsubscribe error:", error);
    return NextResponse.json({ error: "Could not remove this device" }, { status: 500 });
  }
}
