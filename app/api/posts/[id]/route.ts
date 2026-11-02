import { NextRequest, NextResponse } from "next/server";
import { getViewerUid, unauthorized } from "@/lib/api-auth";
import { connectToDB } from "@/utils/database";
import Post from "@/models/post";
import User from "@/models/user";
import { PostType } from "@/types";
import { extractHashtags, syncPostHashtags } from "@/lib/hashtags";
import { canViewPost, isPrivatePost, normalizeVisibility, redactHiddenQuote } from "@/lib/post-visibility";
import { revalidateTag } from "next/cache";
import { recalculateStreakFromPosts } from "@/lib/streakUtils";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDB();
    const { id } = await params;

    const postRaw = (await Post.findById(id)
      .populate("userId", "name username image firebaseId earnedMilestones")
      .populate({
        path: "quotedPostId",
        populate: [
          { path: "userId", select: "name username image firebaseId earnedMilestones" },
          { 
            path: "quotedPostId", 
            populate: { path: "userId", select: "name username image firebaseId earnedMilestones" }
          }
        ]
      })
      .lean()) as PostType | null;

    // Someone else's private reflection reads exactly like a missing one.
    const viewerUid = await getViewerUid(req);
    const viewer = viewerUid
      ? await User.findOne({ firebaseId: viewerUid }).select("_id").lean() as { _id: unknown } | null
      : null;
    if (!postRaw || !canViewPost(postRaw as { visibility?: string; userId?: unknown }, viewer?._id)) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const post = {
      ...postRaw,
      quotedPost:
        postRaw.quotedPostId !== undefined && postRaw.quotedPostId !== null
          ? {
              ...(postRaw.quotedPostId as unknown as PostType),
              quotedPost: (postRaw.quotedPostId as unknown as PostType).quotedPostId,
            }
          : postRaw.quotedPostId === null
            ? null
            : undefined,
    };

    return NextResponse.json(
      { post: redactHiddenQuote(post, viewer?._id) },
      {
        status: 200,
        headers: isPrivatePost(postRaw as { visibility?: string }) ? { "Cache-Control": "private, no-store" } : undefined,
      },
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch post", message: errorMessage },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDB();
    const { id } = await params;
    const firebaseId = await getViewerUid(req);
    if (!firebaseId) return unauthorized();
    const { text, backgroundStyle, fontFamily, visibility: requestedVisibility } = await req.json();

    if (!firebaseId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const user = await User.findOne({ firebaseId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const post = await Post.findById(id);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Check ownership
    if (post.userId.toString() !== user._id.toString()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Update fields
    const previousTags = Array.isArray(post.hashtags) ? post.hashtags : [];

    if (text) post.text = text;
    if (backgroundStyle) post.backgroundStyle = backgroundStyle;
    if (fontFamily) post.fontFamily = fontFamily;

    const wasPublic = post.visibility !== "private";
    if (requestedVisibility !== undefined) post.visibility = normalizeVisibility(requestedVisibility);
    const isPublic = post.visibility !== "private";
    const nextText = text || post.text;

    // Only public reflections live in the hashtag index: going private removes
    // them, going public adds them, and edits re-sync either way.
    if (text || wasPublic !== isPublic) {
      const tags = await syncPostHashtags({
        postId: post._id.toString(),
        nextText: isPublic ? nextText : "",
        previousTags: wasPublic ? previousTags : [],
      });
      post.hashtags = isPublic ? tags : extractHashtags(nextText);
    }

    await post.save();
    if (wasPublic !== isPublic) {
      revalidateTag("feed");
      revalidateTag("public-profile");
      revalidateTag("public-post");
      revalidateTag("public-hashtag");
    }

    return NextResponse.json({ message: "Post updated successfully", post }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to update post", message: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDB();
    const { id: postId } = await params;
    const firebaseId = await getViewerUid(req);
    if (!firebaseId) return unauthorized();

    if (!firebaseId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const user = await User.findOne({ firebaseId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Check ownership
    if (post.userId.toString() !== user._id.toString()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (Array.isArray(post.hashtags) && post.hashtags.length > 0) {
      const Hashtag = (await import("@/models/hashtag")).default;
      const PostHashtag = (await import("@/models/postHashtag")).default;

      const hashtagDocs = await Hashtag.find({ tag: { $in: post.hashtags } }).select("_id tag").lean();

      await Promise.all([
        PostHashtag.deleteMany({ postId: post._id }),
        ...hashtagDocs.map((doc) => Hashtag.updateOne({ _id: doc._id }, { $inc: { postCount: -1 } })),
      ]);
    }

    // If it's a quote, decrement repostCount of original post
    if (post.quotedPostId) {
      await Post.findByIdAndUpdate(post.quotedPostId, { $inc: { repostCount: -1 } });
    }

    // Delete related data
    const Like = (await import("@/models/like")).default;
    const Save = (await import("@/models/save")).default;
    const Comment = (await import("@/models/comment")).default;

    await Promise.all([
      Post.findByIdAndDelete(postId),
      Like.deleteMany({ postId }),
      Save.deleteMany({ postId }),
      Comment.deleteMany({ postId }),
    ]);

    // Recalculate user's streak based on remaining posts
    // Only posts count toward streak, not comments/replies
    const remainingPosts = await Post.find({ userId: user._id })
      .select("createdAt")
      .sort({ createdAt: -1 })
      .lean() as unknown as Array<{ createdAt: Date }>;

    const postDates = remainingPosts.map((p) => p.createdAt);
    const streakUpdate = recalculateStreakFromPosts(postDates, user.longestStreak || 0);

    await User.findByIdAndUpdate(user._id, streakUpdate);

    return NextResponse.json({ message: "Post deleted successfully" }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to delete post", message: errorMessage },
      { status: 500 }
    );
  }
}
