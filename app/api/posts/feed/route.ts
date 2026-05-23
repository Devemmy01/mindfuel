import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import Post from "@/models/post";
import User from "@/models/user";
import Like, { ILike } from "@/models/like";
import Save, { ISave } from "@/models/save";
import Repost from "@/models/repost";
import { PostType } from "@/types";
import { getTodayPrompt } from "@/lib/dailyPrompts";

// In-memory cache for the global feed
const globalFeedCache: {
  [key: string]: { timestamp: number; validPosts: PostType[]; total: number };
} = {};

// GET /api/posts/feed - Optimized feed endpoint that returns posts + user-specific data
export async function GET(req: NextRequest) {
  try {
    await connectToDB();

    const firebaseId = req.nextUrl.searchParams.get("userId");
    const type = req.nextUrl.searchParams.get("type"); // 'feed', 'reflections', or null
    // Pagination removed as per user request for a single-stream feed
    // Allow clients to bypass the server-side cache on an explicit refresh
    const bustCache = req.nextUrl.searchParams.get("bust") === "1";

    let validPosts: PostType[] = [];
    let total = 0;

    const cacheKey = `feed_${type || "all"}_${firebaseId ? "user" : "guest"}`;
    const now = Date.now();
    const CACHE_TTL = 30_000; // 30 seconds

    // 1. Fetch Global Data (Cached if possible, unless busted)
    if (!bustCache && globalFeedCache[cacheKey] && now - globalFeedCache[cacheKey].timestamp < CACHE_TTL) {
      validPosts = globalFeedCache[cacheKey].validPosts;
      total = globalFeedCache[cacheKey].total;
    } else {
      // Get today's prompt ID for boosting
      const todayPrompt = getTodayPrompt();

      // Build match filter based on type
      let matchFilter: Record<string, unknown> = {};
      if (type === "feed") {
        // Feed shows everything
        matchFilter = {};
      } else if (type === "reflections") {
        matchFilter.promptId = { $exists: true, $ne: null, $nin: ["", null] };
      }

      // Intelligent Feed Algorithm: Balance recency and engagement
      // Recent posts get priority, but quality content rises to the top
      const [populatedPosts, totalCount] = await Promise.all([
        Post.aggregate([
          { $match: matchFilter },
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
                      { $ifNull: ["$promptBoost", 1] } // Apply prompt boost multiplier
                    ]
                  },
                  { $pow: [{ $add: [{ $ifNull: ["$ageInHours", 0] }, 1] }, 1.1] }
                ]
              }
            }
          },
          { $sort: { feedScore: -1, createdAt: -1 } },
          {
            $lookup: {
              from: User.collection.name,
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
        Post.countDocuments(matchFilter)
      ]);

      // Populate quoted posts for the aggregated results
      const populatedWithQuotes = await Post.populate(populatedPosts, [
        {
          path: "quotedPostId",
          populate: [
            { path: "userId", select: "name username image firebaseId earnedMilestones" },
            { 
              path: "quotedPostId", 
              populate: { path: "userId", select: "name username image firebaseId earnedMilestones" }
            }
          ]
        }
      ]);

      validPosts = (populatedWithQuotes as PostType[]).map(p => {
        const item = p as unknown as { toObject?: () => PostType };
        return item.toObject ? item.toObject() : p;
      }).filter((p) => p.userId && typeof p.userId === 'object' && 'name' in p.userId);
      total = totalCount;

      // Fallback: Ensure we always have content even if aggregation is sparse
      if (validPosts.length === 0 && totalCount > 0) {
        const fallbackPosts = await Post.find(matchFilter)
          .sort({ createdAt: -1 })
          .populate("userId", "name image firebaseId username earnedMilestones")
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
          .lean();
        validPosts = fallbackPosts as unknown as PostType[];
      }

      globalFeedCache[cacheKey] = {
        timestamp: now,
        validPosts,
        total,
      };
    }

    const hasMore = false;

    // 2. Fetch User Specific Data (Likes/Saves/Reposts) in parallel if logged in
    let likedPostIds: Set<string> = new Set();
    let savedPostIds: Set<string> = new Set();
    let repostedPostIds: Set<string> = new Set();

    if (firebaseId && validPosts.length > 0) {
      const userDoc = await User.findOne({ firebaseId }).select("_id").lean() as { _id: string } | null;

      if (userDoc) {
        const postIds = validPosts.map((p) => p._id);

        const [likedDocs, savedDocs, repostedDocs] = await Promise.all([
          Like.find({ userId: userDoc._id, postId: { $in: postIds } })
            .select("postId")
            .lean() as unknown as Promise<Pick<ILike, "postId">[]>,
          Save.find({ userId: userDoc._id, postId: { $in: postIds } })
            .select("postId")
            .lean() as unknown as Promise<Pick<ISave, "postId">[]>,
          Repost.find({ userId: userDoc._id, postId: { $in: postIds } })
            .select("postId")
            .lean() as unknown as Promise<{ postId: { toString(): string } }[]>,
        ]);

        likedPostIds = new Set(likedDocs.map((l) => l.postId.toString()));
        savedPostIds = new Set(savedDocs.map((s) => s.postId.toString()));
        repostedPostIds = new Set(repostedDocs.map((r) => r.postId.toString()));
      }
    }

    // Attach user-specific data to each post and map quotedPostId to quotedPost
    const enrichedPosts = validPosts.map((post) => {
      const p = post as unknown as PostType & { quotedPostId: unknown };
      let quotedPostData = undefined;

      // Check if it's a quote post (field exists)
      if (p.quotedPostId !== undefined && p.quotedPostId !== null) {
        if (typeof p.quotedPostId === "object" && p.quotedPostId !== null) {
          const quotedDoc = p.quotedPostId as unknown as PostType & { toObject?: () => PostType };
          const finalDoc = quotedDoc.toObject ? quotedDoc.toObject() : quotedDoc;
          
          quotedPostData = {
            ...finalDoc,
            quotedPost: finalDoc.quotedPostId as unknown as PostType,
          };
        } else {
          // It's just an ID string or null, meaning population failed or target deleted
          quotedPostData = null;
        }
      } else if (p.quotedPostId === null) {
        // Explicitly set to null by Mongoose population (target deleted)
        quotedPostData = null;
      }

      return {
        ...post,
        quotedPost: quotedPostData,
        isLiked: likedPostIds.has(post._id.toString()),
        isSaved: savedPostIds.has(post._id.toString()),
        isReposted: repostedPostIds.has(post._id.toString()),
      };
    });

    return NextResponse.json(
      { posts: enrichedPosts, hasMore, total },
      {
        status: 200,
        headers: {
          // Prevent browser/CDN from caching — always fetch fresh from server
          "Cache-Control": "no-store, must-revalidate",
        },
      }
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

