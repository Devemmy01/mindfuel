import "server-only";

import { cache } from "react";
import { Types } from "mongoose";
import { connectToDB } from "@/utils/database";
import Post from "@/models/post";
import User from "@/models/user";
import Hashtag from "@/models/hashtag";
import PostHashtag from "@/models/postHashtag";
import { normalizeHashtag } from "@/lib/hashtags-core";
import type { PostType, ProfileUser } from "@/types";

export interface PublicPost extends PostType {
  updatedAt?: string;
}

export interface PublicProfile extends ProfileUser {
  updatedAt?: string;
  postCount: number;
}

export interface PublicHashtagPage {
  hashtag: { tag: string; displayTag: string; postCount: number; lastUsedAt?: string };
  posts: PostType[];
  total: number;
  hasMore: boolean;
}

function serialize<T>(value: unknown): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export const getPublicPost = cache(async (id: string): Promise<PublicPost | null> => {
  if (!Types.ObjectId.isValid(id)) return null;

  try {
    await connectToDB();
    const post = await Post.findOne({
      _id: id,
      $or: [
        { scheduledAt: null },
        { scheduledAt: { $exists: false } },
        { scheduledAt: { $lte: new Date() } },
      ],
    })
      .populate("userId", "name username image firebaseId earnedMilestones")
      .populate({
        path: "quotedPostId",
        populate: { path: "userId", select: "name username image firebaseId earnedMilestones" },
      })
      .lean();

    if (!post) return null;

    const serialized = serialize<PublicPost & { quotedPostId?: PublicPost }>(post);
    return {
      ...serialized,
      quotedPost: serialized.quotedPostId,
    };
  } catch (error) {
    console.error("Failed to load public post", error);
    return null;
  }
});

export const getPublicProfile = cache(async (firebaseId: string): Promise<PublicProfile | null> => {
  if (!firebaseId) return null;

  try {
    await connectToDB();
    const user = (await User.findOne({ firebaseId })
      .select("_id name username image firebaseId bio createdAt updatedAt earnedMilestones")
      .lean()) as unknown as ({
        _id: Types.ObjectId;
        name: string;
        username?: string;
        image: string;
        firebaseId: string;
        bio?: string;
        createdAt: Date;
        updatedAt?: Date;
      } | null);
    if (!user) return null;

    const postCount = await Post.countDocuments({
      userId: user._id,
      $or: [
        { scheduledAt: null },
        { scheduledAt: { $exists: false } },
        { scheduledAt: { $lte: new Date() } },
      ],
    });

    return { ...serialize<ProfileUser & { updatedAt?: string }>(user), postCount };
  } catch (error) {
    console.error("Failed to load public profile", error);
    return null;
  }
});

export const getPublicHashtagPage = cache(async (tag: string): Promise<PublicHashtagPage> => {
  const normalizedTag = normalizeHashtag(decodeURIComponent(tag));
  const emptyResult: PublicHashtagPage = {
    hashtag: { tag: normalizedTag, displayTag: `#${normalizedTag}`, postCount: 0 },
    posts: [],
    total: 0,
    hasMore: false,
  };
  if (!normalizedTag) return emptyResult;

  try {
    await connectToDB();
    const hashtag = (await Hashtag.findOne({ tag: normalizedTag }).lean()) as unknown as ({
      _id: Types.ObjectId;
      tag: string;
      displayTag: string;
      postCount: number;
      lastUsedAt?: Date;
    } | null);

    let total = 0;
    let posts: PostType[] = [];

    if (hashtag) {
      const relations = await PostHashtag.find({ hashtagId: hashtag._id })
        .sort({ createdAt: -1 })
        .limit(12)
        .select("postId")
        .lean();
      total = await PostHashtag.countDocuments({ hashtagId: hashtag._id });
      const ids = relations.map((relation) => relation.postId);
      const found = await Post.find({ _id: { $in: ids } })
        .populate("userId", "name username image firebaseId earnedMilestones")
        .populate({ path: "quotedPostId", populate: { path: "userId", select: "name username image firebaseId" } })
        .lean();
      const serialized = serialize<PostType[]>(found);
      const postMap = new Map(serialized.map((post) => [post._id.toString(), post]));
      posts = ids.map((id) => postMap.get(id.toString())).filter((post): post is PostType => Boolean(post));
    }

    if (posts.length === 0) {
      const fallback = await Post.find({ hashtags: normalizedTag })
        .populate("userId", "name username image firebaseId earnedMilestones")
        .sort({ createdAt: -1 })
        .limit(12)
        .lean();
      posts = serialize<PostType[]>(fallback);
      total = await Post.countDocuments({ hashtags: normalizedTag });
    }

    return {
      hashtag: {
        tag: hashtag?.tag || normalizedTag,
        displayTag: hashtag?.displayTag || `#${normalizedTag}`,
        postCount: hashtag?.postCount || total,
        lastUsedAt: hashtag?.lastUsedAt?.toISOString(),
      },
      posts,
      total,
      hasMore: total > posts.length,
    };
  } catch (error) {
    console.error("Failed to load public hashtag page", error);
    return emptyResult;
  }
});
