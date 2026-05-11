import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import Post from "@/models/post";
import User from "@/models/user";
import Repost from "@/models/repost";
import { resend } from "@/lib/resend";
import { RepostEmail } from "@/emails/RepostEmail";
import { createNotification } from "@/lib/notifications";
import { Types } from "mongoose";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/posts/[id]/repost — Toggle repost
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    await connectToDB();
    const { id: postId } = await params;
    const { userId: firebaseId } = await req.json();

    if (!firebaseId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [user, originalPost] = await Promise.all([
      User.findOne({ firebaseId }).select("_id name username"),
      Post.findById(postId).populate("userId", "name email"),
    ]);

    if (!user || !originalPost) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Check if already reposted
    const existingRepost = await Repost.findOne({
      userId: user._id,
      postId: originalPost._id,
    });

    if (existingRepost) {
      // Un-repost
      await existingRepost.deleteOne();
      await Post.findByIdAndUpdate(postId, { $inc: { repostCount: -1 } });
      return NextResponse.json({ reposted: false, repostCount: Math.max(0, (originalPost.repostCount ?? 0) - 1) });
    } else {
      // Repost
      await Repost.create({ userId: user._id, postId: originalPost._id });
      await Post.findByIdAndUpdate(postId, { $inc: { repostCount: 1 } });

      // Notify post author
      if (originalPost.userId._id.toString() !== user._id.toString()) {
        try {
          // 1. In-App & Push Notification
          await createNotification({
            recipientId: originalPost.userId._id,
            senderId: user._id,
            type: "repost",
            postId: new Types.ObjectId(postId),
            message: `${user.name} reposted your thought`,
            url: `/post/${postId}`
          });
        } catch (notifErr) {
          console.error("Repost notification failed:", notifErr);
        }
      }

      // Send email notification if reposter is not the author
      if (originalPost.userId._id.toString() !== user._id.toString() && originalPost.userId.email) {
        try {
          const postLink = `${process.env.NEXT_PUBLIC_APP_URL || "https://mind-fuel.app"}/post/${postId}`;
          
          await resend.emails.send({
            from: "MindFuel <notifications@mind-fuel.app>",
            to: originalPost.userId.email,
            subject: `${user.name} reposted your thought`,
            react: RepostEmail({
              authorName: originalPost.userId.name,
              reposterName: user.name,
              postText: originalPost.text,
              postLink,
            }) as React.ReactElement,
          });
        } catch (emailError) {
          console.error("Failed to send repost email:", emailError);
        }
      }

      return NextResponse.json({ reposted: true, repostCount: (originalPost.repostCount ?? 0) + 1 });
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Repost failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET /api/posts/[id]/repost — Check if current user has reposted
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    await connectToDB();
    const { id: postId } = await params;
    const firebaseId = req.nextUrl.searchParams.get("userId");

    if (!firebaseId) {
      return NextResponse.json({ isReposted: false });
    }

    const user = await User.findOne({ firebaseId }).select("_id");
    if (!user) return NextResponse.json({ isReposted: false });

    const exists = await Repost.exists({ userId: user._id, postId });
    return NextResponse.json({ isReposted: !!exists });
  } catch {
    return NextResponse.json({ isReposted: false });
  }
}
