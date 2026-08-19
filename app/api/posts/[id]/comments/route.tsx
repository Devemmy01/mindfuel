import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import Comment from "@/models/comment";
import User, { IUser } from "@/models/user";
import Post from "@/models/post";
import CommentLike from "@/models/commentLike";

import { CommentType } from "@/types";
import { resend } from "@/lib/resend";
import { CommentEmail } from "@/emails/CommentEmail";
import React from "react";
import { createNotification } from "@/lib/notifications";
import mongoose, { Types } from "mongoose";

// GET /api/posts/[id]/comments - Fetch all comments + replies flat
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDB();
    const { id: postIdStr } = await params;
    const firebaseId = req.nextUrl.searchParams.get("userId");
    
    // Explicitly cast to ObjectId to ensure query matches
    const postId = new Types.ObjectId(postIdStr);

    let user = null;
    if (firebaseId) {
      user = await User.findOne({ firebaseId });
    }

    // Fetch ALL comments for the post (top-level + replies), oldest first
    // Use $or to find both string and ObjectId formats for maximum compatibility
    const query = { 
      $or: [
        { postId: postIdStr },
        { postId: postId }
      ]
    };

    const comments = (await Comment.find(query)
      .sort({ createdAt: 1 })
      .populate("userId", "name image firebaseId username")
      .lean()) as unknown as CommentType[];

    // Filter out comments where userId is null (deleted users)
    const validComments = comments.filter((c) => c.userId);

    // Explicitly serialize every field to ensure consistency
    const serializedComments = validComments.map(c => ({
      _id: c._id.toString(),
      postId: c.postId.toString(),
      parentId: c.parentId ? c.parentId.toString() : null,
      content: c.content,
      likesCount: c.likesCount || 0,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      userId: {
        _id: c.userId._id.toString(),
        name: c.userId.name,
        image: c.userId.image,
        firebaseId: c.userId.firebaseId,
        username: c.userId.username || c.userId.name.replace(/\s+/g, "").toLowerCase()
      }
    }));

    console.log(`[GET Comments] Post: ${postIdStr}, Serialized: ${serializedComments.length}`);

    // Self-healing sync: only top-level comments count toward commentsCount
    const topLevelCount = serializedComments.filter((c) => !c.parentId).length;
    
    Post.updateOne(
      { _id: postId, commentsCount: { $ne: topLevelCount } },
      { $set: { commentsCount: topLevelCount } }
    ).catch(err => console.error("Comment count sync failed:", err));

    // If user is logged in, attach like status
    if (user) {
      const commentLikes = await CommentLike.find({
        userId: user._id,
        commentId: { $in: serializedComments.map((c) => new mongoose.Types.ObjectId(c._id)) },
      });
      const likedCommentIds = new Set(
        commentLikes.map((l) => l.commentId.toString()),
      );

      const commentsWithLikeStatus = serializedComments.map((c) => ({
        ...c,
        isLiked: likedCommentIds.has(c._id),
      }));
      
      return NextResponse.json(
        { comments: commentsWithLikeStatus },
        { status: 200 },
      );
    }

    return NextResponse.json({ comments: serializedComments }, { status: 200 });
  } catch (error: unknown) {
    console.error("[GET Comments Error]:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch comments", message: errorMessage },
      { status: 500 },
    );
  }
}

// POST /api/posts/[id]/comments - Create a comment or reply
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDB();
    const { id: postIdStr } = await params;
    const { userId: firebaseId, content, parentId } = await req.json();

    const postId = new Types.ObjectId(postIdStr);

    if (!firebaseId || !content) {
      return NextResponse.json(
        { error: "firebaseId and content are required" },
        { status: 400 },
      );
    }

    const user = await User.findOne({ firebaseId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Validate parentId and enforce 1-level nesting
    let parentComment = null;
    let resolvedParentId: string | null = parentId || null;

    if (parentId) {
      parentComment = await Comment.findById(parentId).populate("userId", "name email firebaseId");
      if (!parentComment) {
        return NextResponse.json({ error: "Parent comment not found" }, { status: 404 });
      }
      resolvedParentId = parentComment._id.toString();
    }

    // Basic content filtering
    const bannedWords = ["scam", "spam", "hate", "violence"];
    const filteredContent = content
      .split(" ")
      .map((word: string) =>
        bannedWords.includes(word.toLowerCase()) ? "****" : word,
      )
      .join(" ");

    const comment = await Comment.create({
      userId: user._id,
      postId,
      parentId: resolvedParentId || null,
      content: filteredContent,
    });

    // Only top-level comments increment commentsCount
    if (!resolvedParentId) {
      await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });
    }

    const populatedComment = await Comment.findById(comment._id)
      .populate("userId", "name image firebaseId username")
      .lean();

    // ── Notifications ──
    try {
      const post = await Post.findById(postId);

      if (resolvedParentId && parentComment) {
        // Notify the PARENT COMMENT AUTHOR when someone replies to their comment
        const parentAuthorId = parentComment.userId?._id ?? parentComment.userId;
        if (parentAuthorId.toString() !== user._id.toString()) {
          await createNotification({
            recipientId: parentAuthorId,
            senderId: user._id,
            type: "comment",
            postId: new Types.ObjectId(postId),
            commentId: comment._id,
            message: `${user.name} replied: "${filteredContent.substring(0, 50)}${filteredContent.length > 50 ? "..." : ""}"`,
            url: `/post/${postId}`,
          });

          const parentAuthor = (await User.findById(parentAuthorId)) as IUser | null;
          if (parentAuthor?.email && parentAuthor.preferences?.notifications !== false) {
            try {
              await resend.emails.send({
                from: "MindFuel <hello@mind-fuel.app>",
                to: parentAuthor.email,
                subject: `${user.name} replied to your reflection`,
                headers: { "X-Entity-Ref-ID": `${postId}-reply-${comment._id}` },
                react: (
                  <CommentEmail
                    authorName={parentAuthor.name}
                    commenterName={user.name}
                    commentContent={filteredContent}
                    postText={post?.text || ""}
                    postLink={`${process.env.NEXT_PUBLIC_BASE_URL || "https://mind-fuel.app"}/post/${postId}`}
                  />
                ) as React.ReactElement,
              });
            } catch (emailErr) {
              console.error("Reply email failed:", emailErr);
            }
          }
        }
      } else if (post && post.userId && post.userId.toString() !== user._id.toString()) {
        // Notify POST AUTHOR for top-level comments
        const author = (await User.findById(post.userId)) as IUser | null;
        if (author) {
          try {
            await createNotification({
              recipientId: post.userId,
              senderId: user._id,
              type: "comment",
              postId: new Types.ObjectId(postId),
              commentId: comment._id,
              message: `${user.name}: ${filteredContent.substring(0, 50)}${filteredContent.length > 50 ? "..." : ""}`,
              url: `/post/${postId}`,
            });
          } catch (notifErr) {
            console.error("In-app/Push notification failed:", notifErr);
          }

          if (author.email && author.preferences?.notifications !== false) {
            try {
              const { error } = await resend.emails.send({
                from: "MindFuel <hello@mind-fuel.app>",
                to: author.email,
                subject: `${user.name} commented on your thought`,
                headers: {
                  "X-Entity-Ref-ID": `${postId}-${comment._id}`,
                  "importance": "high",
                },
                react: (
                  <CommentEmail
                    authorName={author.name}
                    commenterName={user.name}
                    commentContent={filteredContent}
                    postText={post.text}
                    postLink={`${process.env.NEXT_PUBLIC_BASE_URL || "https://mind-fuel.app"}/post/${postId}`}
                  />
                ) as React.ReactElement,
              });
              if (error) console.error("Resend comment email error:", error);
            } catch (emailErr) {
              console.error("Comment email failed (exception):", emailErr);
            }
          }
        }
      }
    } catch (notifyError) {
      console.error("Notification process failed:", notifyError);
    }

    return NextResponse.json({ comment: populatedComment }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to create comment", message: errorMessage },
      { status: 500 },
    );
  }
}
