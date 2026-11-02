import type { Types } from "mongoose";
import Follow from "@/models/follow";
import Post from "@/models/post";
import "@/models/user";
import { PUBLIC_POSTS } from "@/lib/post-visibility";
import { DIGEST_MAX_LOOKBACK_DAYS } from "@/lib/notification-policy";

const DAY_MS = 24 * 60 * 60 * 1000;
export const DIGEST_POST_LIMIT = 5;

export type DigestPost = {
  id: string;
  text: string;
  createdAt: string;
  likes: number;
  comments: number;
  reposts: number;
  author: { name: string; username?: string; image?: string; firebaseId?: string };
};

export type Digest = { posts: DigestPost[]; authorNames: string[]; totalPosts: number };

type PostRow = {
  _id: Types.ObjectId;
  text?: string;
  createdAt: Date;
  likesCount?: number;
  commentsCount?: number;
  repostCount?: number;
  userId?: { name?: string; username?: string; image?: string; firebaseId?: string } | null;
};

/** Start of the digest window: the last digest, but never more than a week back. */
export function digestWindowStart(lastDigestAt: Date | string | null | undefined, now = new Date()) {
  const floor = now.getTime() - DIGEST_MAX_LOOKBACK_DAYS * DAY_MS;
  const last = lastDigestAt ? new Date(lastDigestAt).getTime() : now.getTime() - DAY_MS;
  return new Date(Math.max(floor, Number.isNaN(last) ? now.getTime() - DAY_MS : last));
}

/**
 * Public reflections (not reposts) from people `userId` follows, posted in
 * the window. Private reflections never appear, whoever wrote them.
 */
export async function buildFollowingDigest(userId: Types.ObjectId | string, since: Date, until = new Date()): Promise<Digest | null> {
  const following = (await Follow.find({ follower: userId }).select("following").lean()) as unknown as Array<{ following: Types.ObjectId }>;
  const ids = following.map((row) => row.following).filter((id) => String(id) !== String(userId));
  if (!ids.length) return null;

  const filter = {
    ...PUBLIC_POSTS,
    userId: { $in: ids },
    isRepost: { $ne: true },
    text: { $exists: true, $nin: ["", null] },
    createdAt: { $gt: since, $lte: until },
  };
  const [rows, totalPosts] = await Promise.all([
    Post.find(filter)
      .sort({ createdAt: -1 })
      .limit(DIGEST_POST_LIMIT)
      .select("text createdAt likesCount commentsCount repostCount userId")
      .populate("userId", "name username image firebaseId")
      .lean() as unknown as Promise<PostRow[]>,
    Post.countDocuments(filter),
  ]);
  const posts: DigestPost[] = rows
    .filter((row) => row.userId && row.text)
    .map((row) => ({
      id: String(row._id),
      text: row.text as string,
      createdAt: new Date(row.createdAt).toISOString(),
      likes: row.likesCount || 0,
      comments: row.commentsCount || 0,
      reposts: row.repostCount || 0,
      author: {
        name: row.userId?.name || row.userId?.username || "Someone you follow",
        username: row.userId?.username,
        image: row.userId?.image,
        firebaseId: row.userId?.firebaseId,
      },
    }));
  if (!posts.length) return null;

  const authorNames = Array.from(new Set(posts.map((post) => post.author.name)));
  return { posts, authorNames, totalPosts };
}

/** "Ada shared a new reflection", "Ada and Tolu shared…", "Ada, Tolu and 3 others shared…". */
export function digestHeadline({ authorNames, totalPosts }: Pick<Digest, "authorNames" | "totalPosts">) {
  const noun = totalPosts === 1 ? "a new reflection" : "new reflections";
  const [first, second] = authorNames;
  if (authorNames.length === 1) return `${first} shared ${noun}`;
  if (authorNames.length === 2) return `${first} and ${second} shared ${noun}`;
  const others = authorNames.length - 2;
  return `${first}, ${second} and ${others} ${others === 1 ? "other" : "others"} shared ${noun}`;
}
