import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import Comment from "@/models/comment";
import CommentLike from "@/models/commentLike";
import User from "@/models/user";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDB();
    const { id: commentId } = await params;
    const { userId: firebaseId } = await req.json();

    if (!firebaseId) {
      return NextResponse.json({ error: "firebaseId is required" }, { status: 400 });
    }

    const user = await User.findOne({ firebaseId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if like exists
    const existingLike = await CommentLike.findOne({ userId: user._id, commentId });

    if (existingLike) {
      // Toggle unlike
      await CommentLike.deleteOne({ _id: existingLike._id });
      await Comment.findByIdAndUpdate(commentId, { $inc: { likesCount: -1 } });
      return NextResponse.json({ liked: false }, { status: 200 });
    } else {
      // Toggle like
      await CommentLike.create({ userId: user._id, commentId });
      await Comment.findByIdAndUpdate(commentId, { $inc: { likesCount: 1 } });
      return NextResponse.json({ liked: true }, { status: 200 });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to toggle comment like", message: errorMessage },
      { status: 500 }
    );
  }
}

// GET /api/comments/[id]/like?userId=... - Check if user liked comment
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDB();
    const { id: commentId } = await params;
    const firebaseId = req.nextUrl.searchParams.get("userId");

    if (!firebaseId) {
      return NextResponse.json({ liked: false }, { status: 200 });
    }

    const user = await User.findOne({ firebaseId });
    if (!user) {
      return NextResponse.json({ liked: false }, { status: 200 });
    }

    const like = await CommentLike.findOne({ userId: user._id, commentId });
    return NextResponse.json({ liked: !!like }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to check comment like status" }, { status: 500 });
  }
}
