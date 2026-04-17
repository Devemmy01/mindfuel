import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import Notification from "@/models/notification";
import User from "@/models/user";

export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const firebaseId = req.nextUrl.searchParams.get("userId");

    if (!firebaseId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const user = await User.findOne({ firebaseId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const notifications = await Notification.find({ recipient: user._id })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate("sender", "name image username firebaseId")
      .populate("postId", "text backgroundStyle")
      .lean();

    // Count unread notifications
    const unreadCount = await Notification.countDocuments({ 
      recipient: user._id, 
      isRead: false 
    });

    return NextResponse.json({ notifications, unreadCount }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch notifications", message: errorMessage },
      { status: 500 }
    );
  }
}

// Mark all as read for the user
export async function PATCH(req: NextRequest) {
  try {
    await connectToDB();
    const { userId: firebaseId } = await req.json();

    if (!firebaseId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const user = await User.findOne({ firebaseId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await Notification.updateMany(
      { recipient: user._id, isRead: false },
      { $set: { isRead: true } }
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to update notifications", message: errorMessage },
      { status: 500 }
    );
  }
}
