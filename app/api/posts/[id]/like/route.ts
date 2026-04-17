import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import Post from "@/models/post";
import Like from "@/models/like";
import User from "@/models/user";
import { createNotification } from "@/lib/notifications";
import { Types } from "mongoose";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDB();
    const { id: postId } = await params;
    const { userId: firebaseId } = await req.json();

    if (!firebaseId) {
      return NextResponse.json({ error: "firebaseId is required" }, { status: 400 });
    }

    const user = await User.findOne({ firebaseId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if like exists
    const existingLike = await Like.findOne({ userId: user._id, postId });

    if (existingLike) {
      // Toggle unlike
      await Like.deleteOne({ _id: existingLike._id });
      await Post.findByIdAndUpdate(postId, { $inc: { likesCount: -1 } });
      return NextResponse.json({ liked: false }, { status: 200 });
    } else {
      // Toggle like
      await Like.create({ userId: user._id, postId });
      const post = await Post.findByIdAndUpdate(postId, { $inc: { likesCount: 1 } });
      
      // Notify post author
      if (post && post.userId && post.userId.toString() !== user._id.toString()) {
        await createNotification({
          recipientId: post.userId,
          senderId: user._id,
          type: "like",
          postId: new Types.ObjectId(postId),
          message: `${user.name} liked your reflection`,
          url: `/post/${postId}`
        });
      }

      return NextResponse.json({ liked: true }, { status: 200 });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to toggle like", message: errorMessage },
      { status: 500 }
    );
  }
}

// GET /api/posts/[id]/like?userId=... - Check if user liked post
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDB();
    const { id: postId } = await params;
    const firebaseId = req.nextUrl.searchParams.get("userId");

    if (!firebaseId) {
      return NextResponse.json({ liked: false }, { status: 200 });
    }

    const user = await User.findOne({ firebaseId });
    if (!user) {
      return NextResponse.json({ liked: false }, { status: 200 });
    }

    const like = await Like.findOne({ userId: user._id, postId });
    return NextResponse.json({ liked: !!like }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to check like status" }, { status: 500 });
  }
}
