import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import Post from "@/models/post";
import User from "@/models/user";
import Like, { ILike } from "@/models/like";
import Save, { ISave } from "@/models/save";
import { PostType } from "@/types";
import { getTodayPrompt } from "@/lib/dailyPrompts";

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
    const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    let validPosts: PostType[] = [];
    let total = 0;

    const cacheKey = `feed_${page}_${limit}`;
    const now = Date.now();

    // 1. Fetch Global Data (Cached if possible)
    if (globalFeedCache[cacheKey] && now - globalFeedCache[cacheKey].timestamp < CACHE_TTL) {
      validPosts = globalFeedCache[cacheKey].validPosts;
      total = globalFeedCache[cacheKey].total;
    } else {
      // Get today's prompt ID for boosting
      const todayPrompt = getTodayPrompt();

      // Intelligent Feed Algorithm: Balance recency and engagement
      // Recent posts get priority, but quality content rises to the top
      const [populatedPosts, totalCount] = await Promise.all([
        Post.aggregate([
          {
            $addFields: {
              // MS to Hours
              ageInHours: {
                $divide: [{ $subtract: [new Date(), "$createdAt"] }, 3600000]
              },
              // Boost posts responding to today's prompt (3x multiplier for relevance)
              promptBoost: {
                $cond: [
                  { $eq: ["$promptId", todayPrompt.id] },
                  3,
                  1
                ]
              }
            }
          },
          {
            $addFields: {
              // Intelligent score: (Engagement × Quality) / (Age + 1)^1.1
              // Twitter-inspired weighting: Likes (30x), Comments (50x), Views (0.1x)
              // This rewards quality while maintaining a fresh feed.
              feedScore: {
                $divide: [
                  {
                    $multiply: [
                      {
                        $add: [
                          { $multiply: [{ $ifNull: ["$likesCount", 0] }, 30] },
                          { $multiply: [{ $ifNull: ["$commentsCount", 0] }, 50] },
                          { $multiply: [{ $ifNull: ["$views", 0] }, 0.1] },
                          10 // Base score to ensure new posts surface
                        ]
                      },
                      "$promptBoost" // Apply prompt boost multiplier
                    ]
                  },
                  { $pow: [{ $add: ["$ageInHours", 1] }, 1.1] } // Maintain gravity at 1.1 for freshness
                ]
              }
            }
          },
          { $sort: { feedScore: -1, createdAt: -1 } },
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

