import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import User from "@/models/user";

export async function POST(req: NextRequest) {
  try {
    await connectToDB();
    const { firebaseId, subscription } = await req.json();

    if (!firebaseId || !subscription) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ firebaseId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Add subscription if it doesn't exist
    const subExists = user.pushSubscriptions.some(
      (s: { endpoint: string }) => s.endpoint === subscription.endpoint
    );


    if (!subExists) {
      user.pushSubscriptions.push(subscription);
      await user.save();
    }

    return NextResponse.json({ message: "Subscribed successfully" }, { status: 200 });
  } catch (error: unknown) {
    console.error("Push subscribe error:", error);
    return NextResponse.json(
      { error: "Failed to subscribe" },
      { status: 500 }
    );
  }
}
