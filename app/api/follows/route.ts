import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import Follow from "@/models/follow";
import User from "@/models/user";
import Notification from "@/models/notification";
import { sendPushNotifications, StoredPushSubscription } from "@/lib/sendPushNotifications";

const APP_URL =
  process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ||
  "https://mind-fuel.app";

export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const profileId = req.nextUrl.searchParams.get("profileId");
    const viewerId = req.nextUrl.searchParams.get("viewerId");
    const list = req.nextUrl.searchParams.get("list");
    if (!profileId) return NextResponse.json({ error: "Profile ID is required" }, { status: 400 });

    const profile = await User.findOne({ firebaseId: profileId }).select("_id");
    if (!profile) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (list === "followers" || list === "following") {
      const query = list === "followers" ? { following: profile._id } : { follower: profile._id };
      const path = list === "followers" ? "follower" : "following";
      const rows = await Follow.find(query).sort({ createdAt: -1 }).limit(100)
        .populate(path, "name username image firebaseId bio").lean();
      return NextResponse.json(
        { users: rows.map((row: Record<string, unknown>) => row[path]).filter(Boolean) },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const [followersCount, followingCount, viewer] = await Promise.all([
      Follow.countDocuments({ following: profile._id }),
      Follow.countDocuments({ follower: profile._id }),
      viewerId ? User.findOne({ firebaseId: viewerId }).select("_id") : null,
    ]);
    const [isFollowing, followsViewer] = viewer
      ? await Promise.all([
          Follow.exists({ follower: viewer._id, following: profile._id }).then(Boolean),
          Follow.exists({ follower: profile._id, following: viewer._id }).then(Boolean),
        ])
      : [false, false];
    return NextResponse.json(
      { followersCount, followingCount, isFollowing, followsViewer },
      {
        headers: {
          "Cache-Control": viewerId
            ? "private, no-store"
            : "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error) {
    console.error("Follow lookup failed", error);
    return NextResponse.json({ error: "Failed to load follow information" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDB();
    const { followerId, followingId } = await req.json();
    if (!followerId || !followingId || followerId === followingId) {
      return NextResponse.json({ error: "Invalid follow request" }, { status: 400 });
    }
    const [follower, following] = await Promise.all([
      User.findOne({ firebaseId: followerId }).select("_id name image firebaseId"),
      User.findOne({ firebaseId: followingId }).select(
        "_id preferences pushSubscriptions",
      ),
    ]);
    if (!follower || !following) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const existing = await Follow.findOne({ follower: follower._id, following: following._id });
    if (existing) {
      await existing.deleteOne();
      return NextResponse.json({ isFollowing: false });
    }
    await Follow.create({ follower: follower._id, following: following._id });
    await Notification.updateOne(
      { recipient: following._id, sender: follower._id, type: "follow" },
      { $set: { isRead: false, updatedAt: new Date() }, $setOnInsert: { recipient: following._id, sender: follower._id, type: "follow" } },
      { upsert: true }
    );

    if (
      following.preferences?.notifications !== false &&
      following.pushSubscriptions?.length
    ) {
      const followerImage = String(follower.image || "");
      const icon = followerImage.startsWith("http")
        ? followerImage
        : followerImage.startsWith("/")
          ? `${APP_URL}${followerImage}`
          : `${APP_URL}/icon-192.png`;
      const payload = JSON.stringify({
        title: "New follower",
        body: `${follower.name || "Someone"} followed you`,
        icon,
        badge: `${APP_URL}/icon-192.png`,
        url: `${APP_URL}/profile/${encodeURIComponent(follower.firebaseId)}`,
        tag: `follow-${follower.firebaseId}`,
      });

      await sendPushNotifications({
        recipientId: following._id,
        subscriptions: following.pushSubscriptions as unknown as StoredPushSubscription[],
        payload,
      });
    }

    return NextResponse.json({ isFollowing: true }, { status: 201 });
  } catch (error) {
    console.error("Follow update failed", error);
    return NextResponse.json({ error: "Failed to update follow" }, { status: 500 });
  }
}
