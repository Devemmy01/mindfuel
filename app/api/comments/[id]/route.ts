import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import Comment from "@/models/comment";
import Post from "@/models/post";

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
