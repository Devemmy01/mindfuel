import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import Hashtag from "@/models/hashtag";
import PostHashtag from "@/models/postHashtag";
import Post from "@/models/post";
import { Types } from "mongoose";
import { PostType } from "@/types";
import { normalizeHashtag } from "@/lib/hashtags";
import User from "@/models/user";
import Like from "@/models/like";
import Save from "@/models/save";
import Repost from "@/models/repost";
import { extractHashtags } from "@/lib/hashtags-core";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tag: string }> }
) {
  try {
    await connectToDB();

    const { tag } = await params;
    const normalizedTag = normalizeHashtag(decodeURIComponent(tag));
    const page = Math.max(parseInt(req.nextUrl.searchParams.get("page") || "1"), 1);
    const limit = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get("limit") || "12"), 1), 24);
    const skip = (page - 1) * limit;
    const firebaseId = req.nextUrl.searchParams.get("userId");
    const hashtagPattern = new RegExp(`(?:^|[^\\w])#${normalizedTag.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\b`, "i");

    const fallbackPostFilter = {
      $or: [
        { hashtags: normalizedTag },
        { hashtags: { $in: [normalizedTag] } },
        { text: hashtagPattern },
      ],
    };

    const fetchPostsForTag = async () => {
      const fallbackPosts = (await Post.find(fallbackPostFilter)
        .populate("userId", "name username image firebaseId earnedMilestones")
        .populate({
          path: "quotedPostId",
          populate: [
            { path: "userId", select: "name username image firebaseId earnedMilestones" },
            {
              path: "quotedPostId",
              populate: { path: "userId", select: "name username image firebaseId earnedMilestones" },
            },
          ],
        })
        .sort({ createdAt: -1 })
        .lean()) as unknown as PostType[];

      return fallbackPosts.map((post) => ({
        ...post,
        hashtags: Array.isArray(post.hashtags) && post.hashtags.length > 0
          ? post.hashtags
          : extractHashtags(post.text || ""),
      }));
    };

    const hashtagDoc = (await Hashtag.findOne({ tag: normalizedTag }).lean()) as
      | { _id: Types.ObjectId | string; tag?: string; displayTag?: string; postCount?: number; lastUsedAt?: Date }
      | null;

    let total = 0;
    let orderedPosts: PostType[] = [];
    let pageItemsCount = 0;

    if (hashtagDoc) {
      const [relationCount, relations] = await Promise.all([
        PostHashtag.countDocuments({ hashtagId: hashtagDoc._id }),
        PostHashtag.find({ hashtagId: hashtagDoc._id })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .select("postId createdAt")
          .lean(),
      ]);

      total = relationCount;
      pageItemsCount = relations.length;

      if (relationCount > 0) {
        const postIds = relations.map((relation) => relation.postId);
        const postsRaw = (await Post.find({ _id: { $in: postIds } })
          .populate("userId", "name username image firebaseId earnedMilestones")
          .populate({
            path: "quotedPostId",
            populate: [
              { path: "userId", select: "name username image firebaseId earnedMilestones" },
              {
                path: "quotedPostId",
                populate: { path: "userId", select: "name username image firebaseId earnedMilestones" },
              },
            ],
          })
          .lean()) as unknown as PostType[];

        const postMap = new Map(postsRaw.map((post) => [post._id.toString(), post]));
        orderedPosts = relations
          .map((relation) => postMap.get(relation.postId.toString()))
          .filter(Boolean) as PostType[];
      }
    }

    if (orderedPosts.length === 0) {
      const fallbackPosts = await fetchPostsForTag();
      total = fallbackPosts.length;
      orderedPosts = fallbackPosts.slice(skip, skip + limit);
      pageItemsCount = orderedPosts.length;
    }

    let likedPostIds = new Set<string>();
    let savedPostIds = new Set<string>();
    let repostedPostIds = new Set<string>();

    if (firebaseId && orderedPosts.length > 0) {
      const userDoc = await User.findOne({ firebaseId }).select("_id").lean() as { _id: string } | null;

      if (userDoc) {
        const postIdsForFlags = orderedPosts.map((post) => post._id);
        const [likedDocs, savedDocs, repostedDocs] = await Promise.all([
          Like.find({ userId: userDoc._id, postId: { $in: postIdsForFlags } }).select("postId").lean(),
          Save.find({ userId: userDoc._id, postId: { $in: postIdsForFlags } }).select("postId").lean(),
          Repost.find({ userId: userDoc._id, postId: { $in: postIdsForFlags } }).select("postId").lean(),
        ]);

        likedPostIds = new Set(likedDocs.map((item) => item.postId.toString()));
        savedPostIds = new Set(savedDocs.map((item) => item.postId.toString()));
        repostedPostIds = new Set(repostedDocs.map((item) => item.postId.toString()));
      }
    }

    const enrichedPosts = orderedPosts.map((post) => ({
      ...post,
      isLiked: likedPostIds.has(post._id.toString()),
      isSaved: savedPostIds.has(post._id.toString()),
      isReposted: repostedPostIds.has(post._id.toString()),
    }));

    const hasMore = skip + pageItemsCount < total;

    return NextResponse.json(
      {
        hashtag: {
          tag: hashtagDoc?.tag || normalizedTag,
          displayTag: hashtagDoc?.displayTag || `#${normalizedTag}`,
          postCount: hashtagDoc?.postCount || total,
          lastUsedAt: hashtagDoc?.lastUsedAt || null,
        },
        posts: enrichedPosts,
        total,
        hasMore,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to fetch hashtag feed", message }, { status: 500 });
  }
}