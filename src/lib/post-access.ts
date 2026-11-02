import "server-only";

import { isValidObjectId } from "mongoose";
import { NextResponse } from "next/server";
import Post from "@/models/post";
import { postsVisibleTo } from "@/lib/post-visibility";

/** True when the post exists and the viewer (User _id, or none) may see it. */
export async function viewablePost(postId: string, viewerObjectId?: unknown) {
  if (!isValidObjectId(postId)) return false;
  return Boolean(await Post.exists({ _id: postId, ...postsVisibleTo(viewerObjectId) }));
}

/** The response for a post the viewer may not see: identical to a missing one. */
export function postNotFound() {
  return NextResponse.json({ error: "Post not found" }, { status: 404 });
}
