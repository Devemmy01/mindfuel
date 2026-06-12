import { NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import User from "@/models/user";

export const maxDuration = 5;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { subscription } = body;
    const userId = body.userId || body.firebaseId;

    if (!subscription || !userId) {
      return NextResponse.json({ error: "Subscription and User ID are required" }, { status: 400 });
    }

    await connectToDB();

    // Add the subscription to the user's pushSubscriptions array if it doesn't already exist
    const user = await User.findOneAndUpdate(
      { firebaseId: userId },
      { 
        $addToSet: { pushSubscriptions: subscription },
        $set: { "preferences.notifications": true } 
      },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Subscribed successfully" });
  } catch (error: unknown) {
    console.error("Push subscription error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
