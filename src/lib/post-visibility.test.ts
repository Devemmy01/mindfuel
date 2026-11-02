import { describe, expect, it } from "vitest";
import { canViewPost, normalizeVisibility, postsVisibleTo, PUBLIC_POSTS } from "./post-visibility";

describe("post visibility", () => {
  it("stores anything but an explicit public choice as private", () => {
    expect(normalizeVisibility("public")).toBe("public");
    expect(normalizeVisibility("private")).toBe("private");
    expect(normalizeVisibility(undefined)).toBe("private");
    expect(normalizeVisibility("PUBLIC")).toBe("private");
  });

  it("treats legacy posts without the field as public", () => {
    expect(canViewPost({ userId: "author" }, undefined)).toBe(true);
    expect(canViewPost({ visibility: null, userId: "author" }, "someone")).toBe(true);
  });

  it("shows private posts only to their author", () => {
    const post = { visibility: "private", userId: { _id: "author" } };
    expect(canViewPost(post, undefined)).toBe(false);
    expect(canViewPost(post, "someone-else")).toBe(false);
    expect(canViewPost(post, "author")).toBe(true);
    expect(canViewPost(null, "author")).toBe(false);
  });

  it("builds query filters for guests and signed-in viewers", () => {
    expect(postsVisibleTo()).toEqual(PUBLIC_POSTS);
    expect(postsVisibleTo("viewer")).toEqual({
      $or: [{ visibility: { $ne: "private" } }, { userId: "viewer" }],
    });
  });
});
