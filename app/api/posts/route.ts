import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import Post from "@/models/post";
import User from "@/models/user";
import Like from "@/models/like";
import Save from "@/models/save";
import { PostType } from "@/types";
import { updateStreak } from "@/lib/streakUtils";

// GET /api/posts - Fetch feed or user posts
export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const firebaseId = req.nextUrl.searchParams.get("userId");
    const currentUserId = req.nextUrl.searchParams.get("currentUserId");
    const type = req.nextUrl.searchParams.get("type"); // 'liked' or null (default)
    const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    let query: Record<string, unknown> = {};
    
    if (firebaseId) {
      const user = await User.findOne({ firebaseId });
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      if (type === "liked") {
        const likedDocs = await Like.find({ userId: user._id }).select("postId").lean();
        const postIds = likedDocs.map(l => l.postId);
        query = { _id: { $in: postIds } };
      } else {
        query = { userId: user._id };
      }
    } else {
      // Mindfeed: Show all posts, sorted by recent (removing 24h barrier)
      query = {};
    }
    
    let validPosts: PostType[] = [];
    let total;

    if (!firebaseId) {
      // Global Mindfeed: Optimized chronological sort
      const rawPosts = await Post.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      // Populate userId for aggregated results
      const populatedPosts = await Post.populate(rawPosts, {
        path: "userId",
        select: "name username image firebaseId",
      });

      // Filter out posts where userId is null (deleted users)
      validPosts = (populatedPosts as unknown as PostType[]).filter((p) => p.userId);

      total = await Post.countDocuments(query);
    } else {
      // Profile or Liked feed: Keep simple chronological sort
      const rawPosts = await Post.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "name username image firebaseId")
        .lean();
      
      // Filter out posts where userId is null (deleted users)
      validPosts = (rawPosts as unknown as PostType[]).filter((p) => p.userId);
      
      total = await Post.countDocuments(query);
    }

    const hasMore = total > skip + validPosts.length;

    // Fetch user-specific data if currentUserId is provided
    let likedPostIds: Set<string> = new Set();
    let savedPostIds: Set<string> = new Set();

    if (currentUserId && validPosts.length > 0) {
      const currentUserDoc = await User.findOne({ firebaseId: currentUserId }).select("_id").lean() as { _id: string } | null;
      if (currentUserDoc) {
        const postIds = validPosts.map(p => p._id);
        const [likes, saves] = await Promise.all([
          Like.find({ userId: currentUserDoc._id, postId: { $in: postIds } }).select("postId").lean().exec() as unknown as Promise<Array<{ postId: { toString(): string } }>>,
          Save.find({ userId: currentUserDoc._id, postId: { $in: postIds } }).select("postId").lean().exec() as unknown as Promise<Array<{ postId: { toString(): string } }>>
        ]);
        likedPostIds = new Set(likes.map(l => l.postId.toString()));
        savedPostIds = new Set(saves.map(s => s.postId.toString()));
      }
    }

    const enrichedPosts = validPosts.map(post => ({
      ...post,
      isLiked: likedPostIds.has(post._id.toString()),
      isSaved: savedPostIds.has(post._id.toString())
    }));

    return NextResponse.json({ posts: enrichedPosts, hasMore, total }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch posts", message: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/posts - Create post
export async function POST(req: NextRequest) {
  try {
    await connectToDB();
    const { text, userId: firebaseId, backgroundStyle, fontFamily, isSponsored, promptId } = await req.json();

    if (!text || !firebaseId) {
      return NextResponse.json(
        { error: "Text and firebaseId are required" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ firebaseId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const newPost = await Post.create({
      text,
      userId: user._id,
      backgroundStyle,
      fontFamily: fontFamily || "inter",
      isSponsored: isSponsored || false,
      promptId: promptId || undefined,
      views: 0,
      likesCount: 0,
    });

    // Update user's reflection streak
    const streakUpdate = updateStreak(
      user.lastReflectionDate,
      user.streakDays || 0,
      user.longestStreak || 0
    );

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      streakUpdate,
      { new: true }
    );

    return NextResponse.json(
      { 
        post: newPost,
        streak: {
          streakDays: updatedUser?.streakDays || 0,
          longestStreak: updatedUser?.longestStreak || 0,
        }
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to create post", message: errorMessage },
      { status: 500 }
    );
  }
}
