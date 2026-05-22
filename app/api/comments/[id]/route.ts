import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import Comment from "@/models/comment";
import User from "@/models/user";
import Post from "@/models/post";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDB();
    const { id: commentId } = await params;
    const { userId: firebaseId, content } = await req.json();

    if (!firebaseId || !content) {
      return NextResponse.json(
        { error: "firebaseId and content are required" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ firebaseId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Verify ownership
    if (comment.userId.toString() !== user._id.toString()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Apply content filtering
    const bannedWords = ["scam", "spam", "hate", "violence"];
    const filteredContent = content
      .split(" ")
      .map((word: string) =>
        bannedWords.includes(word.toLowerCase()) ? "****" : word
      )
      .join(" ");

    comment.content = filteredContent;
    await comment.save();

    const updatedComment = await Comment.findById(commentId)
      .populate("userId", "name image firebaseId username")
      .lean();

    return NextResponse.json({ comment: updatedComment }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to update comment", message: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDB();
    const { id: commentId } = await params;

    const deletedComment = await Comment.findByIdAndDelete(commentId);

    if (!deletedComment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Cascade-delete all replies to this comment
    await Comment.deleteMany({ parentId: commentId });

    // Only decrement commentsCount for top-level comments (replies don't count)
    if (!deletedComment.parentId) {
      await Post.updateOne(
        { _id: deletedComment.postId },
        { $inc: { commentsCount: -1 } }
      );
      // Safety: clamp to zero
      await Post.updateOne(
        { _id: deletedComment.postId, commentsCount: { $lt: 0 } },
        { $set: { commentsCount: 0 } }
      );
    }

    return NextResponse.json({ message: "Comment deleted" }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to delete comment", message: errorMessage },
      { status: 500 },
    );
  }
}
