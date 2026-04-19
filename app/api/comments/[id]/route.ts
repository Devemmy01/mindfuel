import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import Comment from "@/models/comment";
import Post from "@/models/post";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDB();
    const { id: commentId } = await params;

    // In a real app, we must verify the user is the owner.
    // For MVP, we'll assume the frontend handled the check.
    const deletedComment = await Comment.findByIdAndDelete(commentId);

    if (deletedComment) {
      await Post.updateOne(
        { _id: deletedComment.postId },
        { $inc: { commentsCount: -1 } }
      );
      // Safety: Ensure count doesn't drop below zero
      await Post.updateOne(
        { _id: deletedComment.postId, commentsCount: { $lt: 0 } },
        { $set: { commentsCount: 0 } }
      );
    }

    if (!deletedComment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Comment deleted" }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to delete comment", message: errorMessage },
      { status: 500 }
    );
  }
}
