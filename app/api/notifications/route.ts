import { NextRequest, NextResponse } from "next/server";
import { getViewerUid, unauthorized } from "@/lib/api-auth";
import { connectToDB } from "@/utils/database";
import Notification from "@/models/notification";
import User from "@/models/user";
import Follow from "@/models/follow";
import { isValidObjectId } from "mongoose";

export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const firebaseId = await getViewerUid(req);
    if (!firebaseId) return unauthorized();

    const user = await User.findOne({ firebaseId });
    if (!user) {
      return NextResponse.json({ notifications: [], unreadCount: 0 }, { status: 200 });
    }

    const notifications = await Notification.find({ recipient: user._id })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate("sender", "name image username firebaseId")
      .populate("postId", "text backgroundStyle")
      .lean();

    const followSenderIds = notifications
      .filter((notification) => notification.type === "follow" && notification.sender)
      .map((notification) => notification.sender._id);
    const followedSenders = followSenderIds.length
      ? await Follow.find({ follower: user._id, following: { $in: followSenderIds } })
          .select("following")
          .lean()
      : [];
    const followedSenderIds = new Set(
      followedSenders.map((follow) => follow.following.toString()),
    );
    const notificationsWithFollowState = notifications.map((notification) => ({
      ...notification,
      isFollowingSender:
        notification.type === "follow" && notification.sender
          ? followedSenderIds.has(notification.sender._id.toString())
          : undefined,
    }));

    // Count unread notifications
    const unreadCount = await Notification.countDocuments({ 
      recipient: user._id, 
      isRead: false 
    });

    return NextResponse.json(
      { notifications: notificationsWithFollowState, unreadCount },
      { status: 200, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to fetch notifications:", errorMessage);
    return NextResponse.json({ notifications: [], unreadCount: 0 }, { status: 200 });
  }
}

// Mark all as read for the user
export async function PATCH(req: NextRequest) {
  try {
    await connectToDB();
    const firebaseId = await getViewerUid(req);
    if (!firebaseId) return unauthorized();

    const user = await User.findOne({ firebaseId });
    if (!user) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // `{ id }` marks one notification read (tapping it); no body marks all.
    const { id } = await req.json().catch(() => ({} as { id?: string }));
    if (id && !isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid notification" }, { status: 400 });
    }
    await Notification.updateMany(
      id ? { _id: id, recipient: user._id } : { recipient: user._id, isRead: false },
      { $set: { isRead: true } }
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to update notifications:", errorMessage);
    return NextResponse.json({ success: true }, { status: 200 });
  }
}
