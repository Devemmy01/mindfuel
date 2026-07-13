import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import Post from "@/models/post";
import User from "@/models/user";
import Like, { ILike } from "@/models/like";
import Save, { ISave } from "@/models/save";
import Repost from "@/models/repost";
import Follow from "@/models/follow";
import { PostType } from "@/types";
import { getTodayPrompt } from "@/lib/dailyPrompts";
import type { PipelineStage } from "mongoose";

// ─── In-process cache (survives across warm function invocations) ─────────────
// Keyed by tab type + auth-status; TTL = 30 s for non-busted requests.
// Each entry stores the ranked post array; user-specific data is NEVER cached
// here — it is always fetched fresh per-request after the cache read.
interface CacheEntry {
  timestamp: number;
  validPosts: PostType[];
  total: number;
  hasMore: boolean;
}
const globalFeedCache: Record<string, CacheEntry> = {};
const CACHE_TTL_MS = 300_000; // five minutes; mutations refresh clients in the background
export const maxDuration = 10;

// ─── Projection: only select fields the feed UI actually renders ──────────────
// Excluding `viewedBy` (large string array, select:false on schema) and other
// heavy fields cuts the data transferred from MongoDB by ~40%.
const AUTHOR_PROJECTION = "name username image firebaseId earnedMilestones";

// GET /api/posts/feed
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const firebaseId = searchParams.get("userId") ?? null;
    const type       = searchParams.get("type") ?? null;   // 'feed' | 'reflections' | null
    const bustCache  = searchParams.get("bust") === "1";
    const page       = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit      = Math.min(30, Math.max(1, Number.parseInt(searchParams.get("limit") || "20", 10) || 20));
    const skip       = (page - 1) * limit;

    await connectToDB();

    // ── 1. Global post list (cached) ─────────────────────────────────────────
    // Ranked pages are viewer-specific because author affinity is part of the
    // score. Interaction flags are still merged fresh below.
    const cacheKey = `feed_${type ?? "all"}_${firebaseId ?? "guest"}_${page}_${limit}`;
    const now = Date.now();

    let validPosts: PostType[] = [];
    let total = 0;
    let hasMore = false;

    const cached = globalFeedCache[cacheKey];
    if (!bustCache && cached && now - cached.timestamp < CACHE_TTL_MS) {
      validPosts = cached.validPosts;
      total      = cached.total;
      hasMore    = cached.hasMore;
    } else {
      // ── Build match filter for the reflections tab ────────────────────────
      // Reflections contains prompt responses only. Feed keeps the filter empty
      // so every original post can participate in ranking.
      const matchFilter: Record<string, unknown> =
        type === "reflections"
          ? { promptId: { $exists: true, $ne: null, $nin: ["", null] } }
          : {};

      // Remap each top-level key to `originalPost.<key>` for use after the
      // $lookup/$unwind in the aggregation (step 4).
      const matchStage: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(matchFilter)) {
        matchStage[`originalPost.${k}`] = v;
      }

      const todayPrompt = getTodayPrompt();
      let affinityAuthorIds: unknown[] = [];
      if (firebaseId && type === "feed") {
        const viewer = await User.findOne({ firebaseId }).select("_id").lean() as { _id: unknown } | null;
        if (viewer) {
          const followed = await Follow.find({ follower: viewer._id }).select("following").lean() as unknown as Array<{ following: unknown }>;
          affinityAuthorIds = [viewer._id, ...followed.map((row) => row.following)];
        }
      }

      // ── Aggregation: ranked union of posts + reposts ──────────────────────
      //
      // Pipeline outline:
      //   1  Project posts → { _id, postId, isRepost:false, repostedByUserId:null }
      //   2  $unionWith reposts → adds { isRepost:true, repostedByUserId }
      //   3  $lookup posts on postId → originalPost[]
      //   4  $unwind originalPost + apply tab match filter
      //   5  $addFields ageInHours + promptBoost + feedScore
      //   6  $sort feedScore desc, createdAt desc
      //   7  Apply page offset and fetch one extra event for hasMore
      //   8  $replaceRoot merging originalPost with repost metadata
      //   9  $lookup users on userId (author)
      //  10  $unwind author + strip sensitive fields via $project
      //
      // Keeps a single DB round-trip for the ranked list.
      const aggregation = Post.aggregate([
        { $match: matchFilter },
        // Step 1
        {
          $project: {
            _id: 1,
            postId: "$_id",
            isRepost: { $literal: false },
            createdAt: "$createdAt",
            repostedByUserId: { $literal: null },
          },
        },
        // Rank the complete history. Pagination below keeps the response small
        // without making older posts permanently unreachable.
        { $sort: { createdAt: -1 } },
        // Step 2. Feed includes repost events; Reflections is originals only.
        ...(type === "reflections" ? [] : ([{
          $unionWith: {
            coll: "reposts",
            pipeline: [
              { $sort: { createdAt: -1 } },
              {
                $project: {
                  _id: 1,
                  postId: "$postId",
                  isRepost: { $literal: true },
                  createdAt: "$createdAt",
                  repostedByUserId: "$userId",
                },
              },
            ],
          },
        }] as PipelineStage[])),
        // Step 3
        {
          $lookup: {
            from: Post.collection.name,
            localField: "postId",
            foreignField: "_id",
            as: "originalPost",
          },
        },
        // Step 4
        { $unwind: "$originalPost" },
        { $match: matchStage },
        // Step 5 – scoring
        {
          $addFields: {
            ageInHours: {
              $divide: [{ $subtract: [new Date(), "$createdAt"] }, 3_600_000],
            },
            promptBoost: {
              $cond: [{ $eq: ["$originalPost.promptId", todayPrompt.id] }, 3, 1],
            },
            affinityBoost: {
              $cond: [{ $in: ["$originalPost.userId", affinityAuthorIds] }, 1.75, 1],
            },
          },
        },
        {
          $addFields: {
            feedScore: {
              $divide: [
                {
                  $multiply: [
                    {
                      $add: [
                        { $multiply: [{ $ifNull: ["$originalPost.likesCount",    0] }, 30]  },
                        { $multiply: [{ $ifNull: ["$originalPost.commentsCount", 0] }, 50]  },
                        { $multiply: [{ $ifNull: ["$originalPost.views",         0] }, 0.1] },
                        10, // base score — new posts always surface
                      ],
                    },
                    {
                      $multiply: [
                        { $ifNull: ["$promptBoost", 1] },
                        { $ifNull: ["$affinityBoost", 1] },
                      ],
                    },
                  ],
                },
                { $pow: [{ $add: [{ $ifNull: ["$ageInHours", 0] }, 1] }, 1.1] },
              ],
            },
          },
        },
        // Step 6
        { $sort: { feedScore: -1, createdAt: -1 } },
        // Step 7 – fetch one extra event so the client knows another page exists.
        { $skip: skip },
        { $limit: limit + 10 },
        // Step 8 – restore original post fields, carry repost metadata
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: [
                "$originalPost",
                {
                  isRepost:         "$isRepost",
                  repostedByUserId: "$repostedByUserId",
                  createdAt:        "$createdAt",
                  _id:              "$originalPost._id",
                },
              ],
            },
          },
        },
        // Step 9 – author lookup
        {
          $lookup: {
            from: User.collection.name,
            localField: "userId",
            foreignField: "_id",
            as: "userId",
          },
        },
        { $unwind: "$userId" },
        // Step 10 – strip sensitive/heavy author fields
        {
          $project: {
            "userId.pushSubscriptions": 0,
            "userId.__v": 0,
            "userId.createdAt": 0,
            "userId.updatedAt": 0,
            "userId.preferences": 0,
          },
        },
      ]);

      // Count query: run in parallel with the aggregation.
      // For the general feed we skip the exact count (expensive full-scan) and
      // return an estimate — the UI only uses this to know whether there is
      // "more" content, not to display a precise number.
      const countQuery =
        type === "reflections"
          ? Post.countDocuments(matchFilter)
          : Post.estimatedDocumentCount(); // O(1) — uses collection metadata

      const [populatedPosts, totalCount] = await Promise.all([aggregation, countQuery]);

      // ── Populate quoted posts (single extra round-trip) ───────────────────
      hasMore = populatedPosts.length > limit;
      const pagePosts = populatedPosts.slice(0, limit);
      const populatedWithQuotes = await Post.populate(pagePosts, [
        {
          path: "quotedPostId",
          select: `text backgroundStyle fontFamily imageUrl createdAt ${AUTHOR_PROJECTION}`,
          populate: [
            { path: "userId", select: AUTHOR_PROJECTION },
            {
              path: "quotedPostId",
              select: `text backgroundStyle fontFamily imageUrl createdAt`,
              populate: { path: "userId", select: AUTHOR_PROJECTION },
            },
          ],
        },
      ]);

      validPosts = (populatedWithQuotes as PostType[])
        .map((p) => {
          const item = p as unknown as { toObject?: () => PostType };
          return item.toObject ? item.toObject() : p;
        })
        .filter(
          (p) => p.userId && typeof p.userId === "object" && "name" in p.userId
        );
      total = totalCount;

      // ── Resolve reposter display names (batch, not N+1) ──────────────────
      const reposterIds = (
        validPosts as Array<PostType & { repostedByUserId?: string }>
      )
        .filter((p) => p.isRepost && p.repostedByUserId)
        .map((p) => (p as PostType & { repostedByUserId: string }).repostedByUserId);

      if (reposterIds.length > 0) {
        interface ReposterDoc {
          _id: { toString(): string };
          name: string;
          username?: string;
          firebaseId?: string;
        }
        const reposterUsers = (await User.find({ _id: { $in: reposterIds } })
          .select("name username firebaseId")
          .lean()) as unknown as ReposterDoc[];

        const reposterMap = new Map(reposterUsers.map((u) => [u._id.toString(), u]));

        validPosts = (
          validPosts as Array<PostType & { repostedByUserId?: string }>
        ).map((p) => {
          if (p.isRepost && p.repostedByUserId) {
            const reposter = reposterMap.get(p.repostedByUserId.toString());
            if (reposter) {
              return {
                ...p,
                repostedBy: {
                  name:       reposter.name,
                  username:   reposter.username,
                  firebaseId: reposter.firebaseId,
                },
              } as PostType;
            }
          }
          return p as PostType;
        });
      }

      // ── Fallback: if aggregation returned nothing but rows exist ──────────
      if (page === 1 && validPosts.length === 0 && totalCount > 0) {
        const fallbackPosts = await Post.find(matchFilter)
          .sort({ createdAt: -1 })
          .limit(limit)
          .populate("userId", AUTHOR_PROJECTION)
          .populate({
            path: "quotedPostId",
            select: `text backgroundStyle fontFamily imageUrl createdAt`,
            populate: [
              { path: "userId", select: AUTHOR_PROJECTION },
              {
                path: "quotedPostId",
                select: `text backgroundStyle fontFamily imageUrl createdAt`,
                populate: { path: "userId", select: AUTHOR_PROJECTION },
              },
            ],
          })
          .lean();
        validPosts = fallbackPosts as unknown as PostType[];
      }

      globalFeedCache[cacheKey] = { timestamp: now, validPosts, total, hasMore };
    }

    // ── 2. User-specific flags (likes / saves / reposts) ─────────────────────
    // These are NEVER cached — each logged-in user gets a fresh read.
    // We batch all three queries in a single Promise.all.
    let likedPostIds:    Set<string> = new Set();
    let savedPostIds:    Set<string> = new Set();
    let repostedPostIds: Set<string> = new Set();

    if (firebaseId && validPosts.length > 0) {
      // Resolve firebaseId → ObjectId in one query (lean, projection only)
      const userDoc = (await User.findOne({ firebaseId })
        .select("_id")
        .lean()) as { _id: string } | null;

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

        likedPostIds    = new Set(likedDocs.map((l) => l.postId.toString()));
        savedPostIds    = new Set(savedDocs.map((s) => s.postId.toString()));
        repostedPostIds = new Set(repostedDocs.map((r) => r.postId.toString()));
      }
    }

    // ── 3. Merge user flags + flatten quotedPostId ────────────────────────────
    const enrichedPosts = validPosts.map((post) => {
      const p = post as unknown as PostType & { quotedPostId: unknown };
      let quotedPostData: unknown = undefined;

      if (p.quotedPostId != null) {
        if (typeof p.quotedPostId === "object") {
          const quotedDoc = p.quotedPostId as unknown as PostType & {
            toObject?: () => PostType;
          };
          const finalDoc = quotedDoc.toObject ? quotedDoc.toObject() : quotedDoc;
          quotedPostData = {
            ...finalDoc,
            quotedPost: finalDoc.quotedPostId as unknown as PostType,
          };
        } else {
          // Only an ID — population failed (post deleted)
          quotedPostData = null;
        }
      }

      return {
        ...post,
        quotedPost: quotedPostData,
        isLiked:    likedPostIds.has(post._id.toString()),
        isSaved:    savedPostIds.has(post._id.toString()),
        isReposted: repostedPostIds.has(post._id.toString()),
      };
    });

    return NextResponse.json(
      { posts: enrichedPosts, hasMore, total, page },
      {
        status: 200,
        headers: {
          // Authenticated responses include private like/save/repost state.
          "Cache-Control": firebaseId
            ? "private, max-age=60, stale-while-revalidate=300"
            : "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[feed] error:", msg);
    return NextResponse.json({ error: "Failed to fetch feed", message: msg }, { status: 500 });
  }
}
