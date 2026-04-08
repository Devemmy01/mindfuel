import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import Comment from "@/models/comment";
import User from "@/models/user";
import CommentLike from "@/models/commentLike";
import { CommentType } from "@/types";

// GET /api/posts/[id]/comments - Fetch comments for a post
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDB();
    const { id: postId } = await params;
    const firebaseId = req.nextUrl.searchParams.get("userId");
    let user = null;
    if (firebaseId) {
      user = await User.findOne({ firebaseId });
    }

    const comments = (await Comment.find({ postId })
      .sort({ createdAt: -1 })
      .populate("userId", "name image firebaseId")
      .lean()) as unknown as CommentType[];

    // If user is logged in, check which comments they liked
    if (user) {
      const commentLikes = await CommentLike.find({
        userId: user._id,
        commentId: { $in: comments.map((c) => c._id) },
      });
      const likedCommentIds = new Set(commentLikes.map((l) => l.commentId.toString()));

      const commentsWithLikeStatus = comments.map((c) => ({
        ...c,
        isLiked: likedCommentIds.has(c._id.toString()),
      }));
      return NextResponse.json({ comments: commentsWithLikeStatus }, { status: 200 });
    }

    return NextResponse.json({ comments }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch comments", message: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/posts/[id]/comments - Create a comment
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDB();
    const { id: postId } = await params;
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

    // Banned words filtering (Basic)
    const bannedWords = ["scam", "spam", "hate", "violence"]; 
    const filteredContent = content.split(" ").map((word: string) => 
      bannedWords.includes(word.toLowerCase()) ? "****" : word
    ).join(" ");

    const comment = await Comment.create({
      userId: user._id,
      postId,
      content: filteredContent,
    });

    const populatedComment = await Comment.findById(comment._id).populate("userId", "name image firebaseId").lean();

    return NextResponse.json({ comment: populatedComment }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to create comment", message: errorMessage },
      { status: 500 }
    );
  }
}
