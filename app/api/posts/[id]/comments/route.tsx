import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import Comment from "@/models/comment";
import User, { IUser } from "@/models/user";
import Post from "@/models/post";
import CommentLike from "@/models/commentLike";
import webpush from "@/lib/push";
import { PushSubscription } from "web-push";

import { CommentType } from "@/types";
import { resend } from "@/lib/resend";
import { CommentEmail } from "@/emails/CommentEmail";
import React from "react";

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

    // Filter out comments where userId is null (deleted users)
    const validComments = comments.filter((c) => c.userId);

    // If user is logged in, check which comments they liked
    if (user) {
      const commentLikes = await CommentLike.find({
        userId: user._id,
        commentId: { $in: validComments.map((c) => c._id) },
      });
      const likedCommentIds = new Set(commentLikes.map((l) => l.commentId.toString()));

      const commentsWithLikeStatus = validComments.map((c) => ({
        ...c,
        isLiked: likedCommentIds.has(c._id.toString()),
      }));
      return NextResponse.json({ comments: commentsWithLikeStatus }, { status: 200 });
    }

    return NextResponse.json({ comments: validComments }, { status: 200 });
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

    // Increment commentsCount on the post
    await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });

    const populatedComment = await Comment.findById(comment._id).populate("userId", "name image firebaseId").lean();

    // Notify post author
    try {
      const post = await Post.findById(postId);
      if (post && post.userId && post.userId.toString() !== user._id.toString()) {
        const author = await User.findById(post.userId) as IUser | null;

        if (author) {
          // 1. Email Notification
          if (author.email && author.preferences?.notifications !== false) {
            await resend.emails.send({
              from: 'MindFuel <hello@mind-fuel.app>',
              to: author.email,
              subject: `${user.name} commented on your thought`,
              react: (<CommentEmail
                authorName={author.name}
                commenterName={user.name}
                commentContent={filteredContent}
                postText={post.text}
                postLink={`${process.env.NEXT_PUBLIC_BASE_URL || 'https://mind-fuel.app'}/post/${postId}`}
              />) as React.ReactElement,
            });
          }

          // 2. Push Notification
          if (author.pushSubscriptions && author.pushSubscriptions.length > 0 && author.preferences?.notifications !== false) {
            const payload = JSON.stringify({
              title: "New Comment on MindFuel",
              body: `${user.name}: ${filteredContent.substring(0, 50)}${filteredContent.length > 50 ? '...' : ''}`,
              icon: "/logo.png",
              url: `/post/${postId}`,
            });

            author.pushSubscriptions.forEach((sub) => {
              webpush.sendNotification(sub as unknown as PushSubscription, payload).catch(err => console.error("Push failed:", err));
            });
          }
        }
      }
    } catch (notifyError) {
      console.error("Notification failed:", notifyError);
    }

    return NextResponse.json({ comment: populatedComment }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to create comment", message: errorMessage },
      { status: 500 }
    );
  }
}
