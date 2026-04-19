import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import Post from "@/models/post";
import User from "@/models/user";
import Like, { ILike } from "@/models/like";
import Save, { ISave } from "@/models/save";
import { PostType } from "@/types";

// In-memory cache for the global feed
const globalFeedCache: {
  [key: string]: { timestamp: number; validPosts: PostType[]; total: number }
} = {};
const CACHE_TTL = 30000; // 30 seconds

// GET /api/posts/feed - Optimized feed endpoint that returns posts + user-specific data
export async function GET(req: NextRequest) {
  try {
    await connectToDB();

    const firebaseId = req.nextUrl.searchParams.get("userId");
    const sort = req.nextUrl.searchParams.get("sort") || "trending"; // trending or newest
    const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    let validPosts: PostType[] = [];
    let total = 0;

    const cacheKey = `feed_${sort}_${page}_${limit}`;
    const now = Date.now();

    // 1. Fetch Global Data (Cached if possible)
    if (globalFeedCache[cacheKey] && now - globalFeedCache[cacheKey].timestamp < CACHE_TTL) {
      validPosts = globalFeedCache[cacheKey].validPosts;
      total = globalFeedCache[cacheKey].total;
    } else {
      let populatedPosts: unknown[];
      let totalCount: number;

      if (sort === "trending") {
        // Trending Algorithm: (Engagement) / (Age + 2)^1.8
        [populatedPosts, totalCount] = await Promise.all([
          Post.aggregate([
            {
              $addFields: {
                // MS to Hours
                ageInHours: {
                  $divide: [{ $subtract: [new Date(), "$createdAt"] }, 3600000]
                }
              }
            },
            {
              $addFields: {
                trendingScore: {
                  $divide: [
                    {
                      $add: [
                        { $multiply: [{ $ifNull: ["$likesCount", 0] }, 3] },
                        { $multiply: [{ $ifNull: ["$commentsCount", 0] }, 5] },
                        { $multiply: [{ $ifNull: ["$views", 0] }, 0.1] },
                        0.1 // Base score for newest items
                      ]
                    },
                    { $pow: [{ $add: ["$ageInHours", 2] }, 1.8] }
                  ]
                }
              }
            },
            { $sort: { trendingScore: -1, createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "userId"
              }
            },
            { $unwind: "$userId" },
            {
              $project: {
                "userId.pushSubscriptions": 0,
                "userId.__v": 0,
                "userId.createdAt": 0,
                "userId.updatedAt": 0,
                "userId.preferences": 0,
              }
            }
          ]),
          Post.estimatedDocumentCount()
        ]);
      } else {
        // Simple Newest sort
        [populatedPosts, totalCount] = await Promise.all([
          Post.find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate({
              path: "userId",
              select: "name username image firebaseId",
            })
            .lean(),
          Post.estimatedDocumentCount()
        ]);
      }

      validPosts = (populatedPosts as unknown as PostType[]).filter((p) => p.userId);
      total = totalCount;

      globalFeedCache[cacheKey] = {
        timestamp: now,
        validPosts,
        total,
      };
    }

    const hasMore = total > skip + validPosts.length;

    // 2. Fetch User Specific Data (Likes/Saves) in parallel if logged in
    let likedPostIds: Set<string> = new Set();
    let savedPostIds: Set<string> = new Set();

    if (firebaseId && validPosts.length > 0) {
      const userDoc = await User.findOne({ firebaseId }).select("_id").lean() as { _id: string } | null;

      if (userDoc) {
        const postIds = validPosts.map((p) => p._id);

        const [likedDocs, savedDocs] = await Promise.all([
          Like.find({ userId: userDoc._id, postId: { $in: postIds } })
            .select("postId")
            .lean() as unknown as Promise<Pick<ILike, "postId">[]>,
          Save.find({ userId: userDoc._id, postId: { $in: postIds } })
            .select("postId")
            .lean() as unknown as Promise<Pick<ISave, "postId">[]>,
        ]);

        likedPostIds = new Set(likedDocs.map((l) => l.postId.toString()));
        savedPostIds = new Set(savedDocs.map((s) => s.postId.toString()));
      }
    }

    // Attach user-specific data to each post
    const enrichedPosts = validPosts.map((post) => ({
      ...post,
      isLiked: likedPostIds.has(post._id.toString()),
      isSaved: savedPostIds.has(post._id.toString()),
    }));

    return NextResponse.json(
      { posts: enrichedPosts, hasMore, total },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Feed API Error:", errorMessage);
    return NextResponse.json(
      { error: "Failed to fetch feed", message: errorMessage },
      { status: 500 }
    );
  }
}

