import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import Post from "@/models/post";
import User from "@/models/user";
import Like from "@/models/like";
import Save from "@/models/save";
import { PostType } from "@/types";

// GET /api/posts/feed - Optimized feed endpoint that returns posts + user-specific data
export async function GET(req: NextRequest) {
  try {
    await connectToDB();

    const firebaseId = req.nextUrl.searchParams.get("userId");
    const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Global Mindfeed: Use Calm Decay Scoring
    let posts = await Post.aggregate([
      { $match: {} },
      {
        $addFields: {
          ageInHours: {
            $divide: [
              { $subtract: [new Date(), "$createdAt"] },
              3600000,
            ],
          },
        },
      },
      {
        $addFields: {
          score: {
            $divide: [
              {
                $add: [
                  { $multiply: [{ $ln: { $add: ["$likesCount", 1] } }, 2] },
                  { $ln: { $add: ["$views", 1] } },
                ],
              },
              { $pow: [{ $add: ["$ageInHours", 2] }, 1.5] },
            ],
          },
        },
      },
      { $sort: { score: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    // Populate userId for aggregated results
    posts = await Post.populate(posts, {
      path: "userId",
      select: "name username image firebaseId",
    });

    // Filter out posts where userId is null (deleted users)
    posts = (posts as unknown as PostType[]).filter((p) => p.userId);

    const total = await Post.countDocuments({});
    const hasMore = total > skip + posts.length;

    // If user is logged in, batch-fetch their like and save status
    let likedPostIds: Set<string> = new Set();
    let savedPostIds: Set<string> = new Set();

    if (firebaseId) {
      const userDoc = await User.findOne({ firebaseId }).select("_id").lean();
      if (userDoc) {
        const user = userDoc as { _id: string };
        const postIds = posts.map((p: PostType) => p._id);

        const [likedDocs, savedDocs] = await Promise.all([
          Like.find({ userId: user._id, postId: { $in: postIds } })
            .select("postId")
            .lean(),
          Save.find({ userId: user._id, postId: { $in: postIds } })
            .select("postId")
            .lean(),
        ]);

        likedPostIds = new Set(likedDocs.map((l) => l.postId.toString()));
        savedPostIds = new Set(savedDocs.map((s) => s.postId.toString()));
      }
    }

    // Attach user-specific data to each post
    const enrichedPosts = posts.map((post: PostType) => ({
      ...post,
      isLiked: likedPostIds.has(post._id.toString()),
      isSaved: savedPostIds.has(post._id.toString()),
    }));

    return NextResponse.json(
      { posts: enrichedPosts, hasMore, total },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch feed", message: errorMessage },
      { status: 500 }
    );
  }
}
