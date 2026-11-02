import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import User from "@/models/user";

export const maxDuration = 5;

/**
 * Called by the service worker on `pushsubscriptionchange`, which has no
 * user session. Possession of the previous endpoint (an unguessable push
 * service URL) identifies the device; the new subscription replaces it.
 */
export async function POST(req: NextRequest) {
  try {
    const { oldEndpoint, subscription } = await req.json();
    const valid =
      typeof oldEndpoint === "string" &&
      oldEndpoint.startsWith("https://") &&
      typeof subscription?.endpoint === "string" &&
      subscription.endpoint.startsWith("https://") &&
      typeof subscription?.keys?.p256dh === "string" &&
      typeof subscription?.keys?.auth === "string";
    if (!valid) return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });

    await connectToDB();
    const result = await User.updateOne(
      { "pushSubscriptions.endpoint": oldEndpoint },
      {
        $set: {
          "pushSubscriptions.$.endpoint": subscription.endpoint,
          "pushSubscriptions.$.keys": { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
          "pushSubscriptions.$.lastSeen": new Date(),
        },
      },
    );
    return NextResponse.json({ success: result.modifiedCount > 0 });
  } catch (error) {
    console.error("Push resubscribe failed", error);
    return NextResponse.json({ error: "Could not update the subscription" }, { status: 500 });
  }
}
