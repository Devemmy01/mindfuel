import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import Post from "@/models/post";
import User from "@/models/user";
import { PostType } from "@/types";
import { syncPostHashtags } from "@/lib/hashtags";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDB();
    const { id } = await params;

    const postRaw = (await Post.findById(id)
      .populate("userId", "name username image firebaseId")
      .populate({
        path: "quotedPostId",
        populate: [
          { path: "userId", select: "name username image firebaseId" },
          { 
            path: "quotedPostId", 
            populate: { path: "userId", select: "name username image firebaseId" }
          }
        ]
      })
      .lean()) as PostType | null;

    if (!postRaw) {
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

    return NextResponse.json({ post }, { status: 200 });
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
    const { userId: firebaseId, text, backgroundStyle, fontFamily } = await req.json();

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

    if (text) {
      post.hashtags = await syncPostHashtags({
        postId: post._id.toString(),
        nextText: text,
        previousTags,
      });
    }

    await post.save();

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
    const { userId: firebaseId } = await req.json();

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

    return NextResponse.json({ message: "Post deleted successfully" }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to delete post", message: errorMessage },
      { status: 500 }
    );
  }
}
