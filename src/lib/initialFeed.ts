import "server-only";

import { unstable_cache } from "next/cache";
import Post from "@/models/post";
import { connectToDB } from "@/utils/database";
import type { PostType } from "@/types";

const AUTHOR_FIELDS = "name username image firebaseId earnedMilestones";

/**
 * A small public snapshot for the first paint. Personal interaction state is
 * merged by SWR after Firebase restores the viewer session.
 */
export const getInitialReflectionPosts = unstable_cache(
  async (): Promise<PostType[]> => {
    await connectToDB();

    const posts = await Post.find({
      promptId: { $exists: true, $nin: ["", null] },
    })
      .sort({ createdAt: -1 })
      .limit(15)
      .populate("userId", AUTHOR_FIELDS)
      .populate({
        path: "quotedPostId",
        select: "text backgroundStyle fontFamily imageUrl createdAt promptId likesCount commentsCount views",
        populate: { path: "userId", select: AUTHOR_FIELDS },
      })
      .lean();

    // Client component boundaries require plain JSON values, not ObjectIds.
    return JSON.parse(JSON.stringify(posts)) as PostType[];
  },
  ["initial-reflection-feed-v3"],
  { revalidate: 300, tags: ["feed"] }
);
