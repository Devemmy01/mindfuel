/**
 * Who can see a reflection.
 *
 * - "private": only the author. Never in feeds, hashtags, search, sitemap,
 *   Open Graph images, or other people's view of the author's profile.
 * - "public": everyone.
 *
 * Posts created before visibility existed have no field and are public.
 * New posts are private unless the author chooses "public".
 */
export type PostVisibility = "private" | "public";

/** Mongo filter for posts anyone may see. */
export const PUBLIC_POSTS = { visibility: { $ne: "private" } } as const;

/** Mongo filter for posts a given viewer may see (public + their own). */
export function postsVisibleTo(viewerObjectId?: unknown) {
  if (!viewerObjectId) return { ...PUBLIC_POSTS };
  return { $or: [{ visibility: { $ne: "private" } }, { userId: viewerObjectId }] };
}

/** Anything other than an explicit "public" is stored as private. */
export function normalizeVisibility(value: unknown): PostVisibility {
  return value === "public" ? "public" : "private";
}

type VisibilityFields = {
  visibility?: string | null;
  userId?: unknown;
};

function idOf(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "_id" in value) {
    return String((value as { _id: unknown })._id);
  }
  return String(value);
}

export function isPrivatePost(post: VisibilityFields | null | undefined) {
  return post?.visibility === "private";
}

/** True when the viewer (a User ObjectId, or nothing for guests) may see the post. */
export function canViewPost(post: VisibilityFields | null | undefined, viewerObjectId?: unknown) {
  if (!post) return false;
  if (!isPrivatePost(post)) return true;
  const viewer = idOf(viewerObjectId);
  return Boolean(viewer) && idOf(post.userId) === viewer;
}

/**
 * A post can quote one that later became private. Strip quotes the viewer may
 * not see so quoted text never leaks through another post.
 */
export function redactHiddenQuote<T extends { quotedPostId?: unknown; quotedPost?: unknown }>(
  post: T,
  viewerObjectId?: unknown,
): T {
  const quoted = (post.quotedPostId ?? post.quotedPost) as VisibilityFields | null | undefined;
  if (quoted && typeof quoted === "object" && !canViewPost(quoted, viewerObjectId)) {
    return { ...post, quotedPostId: null, quotedPost: null };
  }
  return post;
}
