import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import Post from "@/models/post";
import User from "@/models/user";
import Like from "@/models/like";
import Save from "@/models/save";
import Repost from "@/models/repost";
import { PostType } from "@/types";
import { updateStreak } from "@/lib/streakUtils";
import { resend } from "@/lib/resend";
import { QuoteEmail } from "@/emails/QuoteEmail";
import { createNotification } from "@/lib/notifications";
import { IUser } from "@/models/user";
import { PipelineStage } from "mongoose";
import { syncPostHashtags } from "@/lib/hashtags";
import { checkNewMilestones, getMilestoneById } from "@/lib/milestones";
import { revalidateTag } from "next/cache";

export const maxDuration = 10;

// GET /api/posts - Fetch feed or user posts
export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const firebaseId = req.nextUrl.searchParams.get("userId");
    const currentUserId = req.nextUrl.searchParams.get("currentUserId");
    const type = req.nextUrl.searchParams.get("type"); // 'liked' or null (default)
    const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const quotedPostId = req.nextUrl.searchParams.get("quotedPostId");
    let query: Record<string, unknown> = {};
    let queryUser: IUser | null = null;
    
    if (quotedPostId) {
      query = { quotedPostId };
    } else if (firebaseId) {
      queryUser = await User.findOne({ firebaseId });
      if (!queryUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      if (type === "liked") {
        const likedDocs = await Like.find({ userId: queryUser._id }).select("postId").lean();
        const postIds = likedDocs.map(l => l.postId);
        query = { _id: { $in: postIds } };
      } else {
        const repostDocs = await Repost.find({ userId: queryUser._id }).select("postId").lean() as unknown as Array<{ postId: { toString(): string } }>;
        const repostedPostIds = repostDocs.map(r => r.postId);
        query = { $or: [{ userId: queryUser._id }, { _id: { $in: repostedPostIds } }] };
      }
    } else {
      // Mindfeed: Show all posts, sorted by recent (removing 24h barrier)
      query = {};
    }
    
    let validPosts: PostType[] = [];
    let total;

    if (!firebaseId) {
      // Global Mindfeed: Aggregation pipeline to merge posts and reposts
      const aggregationPipeline = [
        { $match: query },
        { 
          $project: { 
            _id: 1, 
            isRepost: { $literal: false }, 
            sortDate: "$createdAt", 
            repostedByUserId: { $literal: null } 
          } 
        },
        { 
          $unionWith: { 
            coll: "reposts",
            pipeline: [
              { 
                $project: { 
                  _id: "$postId", 
                  isRepost: { $literal: true }, 
                  sortDate: "$createdAt", 
                  repostedByUserId: "$userId" 
                } 
              }
            ]
          }
        },
        { $sort: { sortDate: -1 } },
        {
          $facet: {
            metadata: [{ $count: "total" }],
            data: [{ $skip: skip }, { $limit: limit }]
          }
        }
      ] as PipelineStage[];

      const aggResults = await Post.aggregate(aggregationPipeline);
      total = aggResults[0]?.metadata[0]?.total || 0;
      const feedItems = aggResults[0]?.data || [];

      // Fetch the actual post data and populate
      const postIds = feedItems.map((item: { _id: string }) => item._id);
      
      const postsRaw = (await Post.find({ _id: { $in: postIds } })
        .populate("userId", "name username image firebaseId earnedMilestones")
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
        .lean()) as unknown as PostType[];
        
      const postMap = new Map(postsRaw.map((p: PostType) => [p._id.toString(), p]));

      // Populate reposter users
      const reposterIds = feedItems.filter((item: { isRepost: boolean; repostedByUserId: string }) => item.isRepost && item.repostedByUserId).map((item: { repostedByUserId: string }) => item.repostedByUserId);
      const reposterUsers = (await User.find({ _id: { $in: reposterIds } }).select("name username firebaseId").lean()) as unknown as Array<{ _id: string; name: string; username?: string; firebaseId: string }>;
      const reposterMap = new Map(reposterUsers.map((u: { _id: string; name: string; username?: string; firebaseId: string }) => [u._id.toString(), u]));

      // Construct final validPosts in sorted order
      for (const item of feedItems) {
        const postData = postMap.get(item._id.toString());
        if (postData && postData.userId) { // Ensure user isn't deleted
          const enrichedPost = { ...postData };
          if (item.isRepost) {
            const reposter = reposterMap.get(item.repostedByUserId?.toString());
            if (reposter) {
              enrichedPost.isRepost = true;
              enrichedPost.repostedBy = {
                name: reposter.name,
                username: reposter.username,
                firebaseId: reposter.firebaseId
              };
            }
          }
          validPosts.push(enrichedPost as unknown as PostType);
        }
      }
    } else if (type === "liked" && queryUser) {
      // Liked feed: DB-level pagination — fetch only liked postIds for this page
      const [likedDocs, likedTotal] = await Promise.all([
        Like.find({ userId: queryUser._id })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .select("postId")
          .lean() as unknown as Promise<Array<{ postId: string }>>,
        Like.countDocuments({ userId: queryUser._id }),
      ]);

      total = likedTotal;
      const likedPostIds = likedDocs.map((l) => l.postId);

      if (likedPostIds.length > 0) {
        const rawPosts = await Post.find({ _id: { $in: likedPostIds } })
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
          .lean();
        // Re-sort to match liked order (MongoDB $in doesn't preserve order)
        const postMap = new Map((rawPosts as unknown as PostType[]).map((p) => [p._id.toString(), p]));
        validPosts = likedPostIds
          .map((id) => postMap.get(id.toString()))
          .filter((p): p is PostType => !!p && !!p.userId);
      }
    } else {
      // Profile feed: union only the requested page of posts and reposts.
      // The previous implementation loaded every post into memory and sliced
      // afterward, which made established profiles increasingly slow.
      const profileItems = await Post.aggregate([
        { $match: { userId: queryUser?._id } },
        { $project: { postId: "$_id", isRepost: { $literal: false }, sortDate: "$createdAt" } },
        {
          $unionWith: {
            coll: "reposts",
            pipeline: [
              { $match: { userId: queryUser?._id } },
              { $project: { postId: 1, isRepost: { $literal: true }, sortDate: "$createdAt" } },
            ],
          },
        },
        { $sort: { sortDate: -1 } },
        { $facet: { metadata: [{ $count: "total" }], data: [{ $skip: skip }, { $limit: limit }] } },
      ] as PipelineStage[]);

      const items = profileItems[0]?.data || [];
      total = profileItems[0]?.metadata[0]?.total || 0;
      const postIds = items.map((item: { postId: string }) => item.postId);
      const rawPosts = await Post.find({ _id: { $in: postIds } })
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
          .lean();
      const postMap = new Map((rawPosts as unknown as PostType[]).filter((post) => post.userId).map((post) => [post._id.toString(), post]));
      validPosts = items.flatMap((item: { postId: { toString(): string }; isRepost: boolean }) => {
        const post = postMap.get(item.postId.toString());
        if (!post) return [];
        return [{
          ...post,
          isRepost: item.isRepost,
          repostedBy: item.isRepost && queryUser ? {
            name: queryUser.name,
            username: queryUser.username,
            firebaseId: queryUser.firebaseId,
          } : undefined,
        }];
      });
    }

    const hasMore = total > skip + validPosts.length;

    // Fetch user-specific data if currentUserId is provided
    let likedPostIds: Set<string> = new Set();
    let savedPostIds: Set<string> = new Set();
    let repostedPostIds: Set<string> = new Set();

    if (currentUserId && validPosts.length > 0) {
      const currentUserDoc = await User.findOne({ firebaseId: currentUserId }).select("_id").lean() as { _id: string } | null;
      if (currentUserDoc) {
        const postIds = validPosts.map(p => p._id);
        const [likes, saves, reposts] = await Promise.all([
          Like.find({ userId: currentUserDoc._id, postId: { $in: postIds } }).select("postId").lean().exec() as unknown as Promise<Array<{ postId: { toString(): string } }>>,
          Save.find({ userId: currentUserDoc._id, postId: { $in: postIds } }).select("postId").lean().exec() as unknown as Promise<Array<{ postId: { toString(): string } }>>,
          Repost.find({ userId: currentUserDoc._id, postId: { $in: postIds } }).select("postId").lean().exec() as unknown as Promise<Array<{ postId: { toString(): string } }>>
        ]);
        likedPostIds = new Set(likes.map(l => l.postId.toString()));
        savedPostIds = new Set(saves.map(s => s.postId.toString()));
        repostedPostIds = new Set(reposts.map(r => r.postId.toString()));
      }
    }

    const enrichedPosts = validPosts.map(post => {
      const p = post as unknown as PostType & { quotedPostId: unknown };
      let quotedPostData = undefined;
      
      if (p.quotedPostId !== undefined && p.quotedPostId !== null) {
        if (typeof p.quotedPostId === 'object' && p.quotedPostId !== null) {
          const quotedDoc = p.quotedPostId as PostType;
          quotedPostData = {
            ...quotedDoc,
            quotedPost: (quotedDoc as unknown as { quotedPostId: PostType }).quotedPostId
          };
        } else {
          quotedPostData = null;
        }
      } else if (p.quotedPostId === null) {
        quotedPostData = null;
      }
      
      return {
        ...post,
        quotedPost: quotedPostData,
        isLiked: likedPostIds.has(post._id.toString()),
        isSaved: savedPostIds.has(post._id.toString()),
        isReposted: repostedPostIds.has(post._id.toString())
      };
    });

    return NextResponse.json(
      { posts: enrichedPosts, hasMore, total },
      {
        status: 200,
        headers: {
          "Cache-Control": currentUserId
            ? "private, max-age=60, stale-while-revalidate=300"
            : "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch posts", message: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/posts - Create post
export async function POST(req: NextRequest) {
  try {
    await connectToDB();
    const { text, userId: firebaseId, backgroundStyle, fontFamily, isSponsored, promptId, imageUrl, poll, quotedPostId, scheduledAt } = await req.json();

    if (!text || !firebaseId) {
      return NextResponse.json(
        { error: "Text and firebaseId are required" },
        { status: 400 }
      );
    }

    const user = (await User.findOne({ firebaseId })) as IUser | null;
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const newPost = await Post.create({
      text,
      userId: user._id,
      backgroundStyle: backgroundStyle || { id: "obsidian", type: "color", value: "#0a0a0a", text: "#ffffff" },
      fontFamily: fontFamily || "inter",
      isSponsored: isSponsored || false,
      promptId: promptId || undefined,
      imageUrl: imageUrl || null,
      poll: poll || undefined,
      quotedPostId: quotedPostId || undefined,
      scheduledAt: scheduledAt || null,
      views: 0,
      likesCount: 0,
      repostCount: 0,
    });

    const hashtags = await syncPostHashtags({
      postId: newPost._id.toString(),
      nextText: text,
    });

    newPost.hashtags = hashtags;
    await newPost.save();

    // Update user's reflection streak
    const streakUpdate = updateStreak(
      user.lastReflectionDate,
      user.streakDays || 0,
      user.longestStreak || 0
    );

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $set: { ...streakUpdate, lastInactivityReminderAt: null } },
      { new: true }
    );

    // Handle Quote Repost Notifications & Counts
    if (quotedPostId) {
      try {
        // Increment repostCount and fetch post + author in parallel
        const [originalPost] = await Promise.all([
          Post.findById(quotedPostId),
          Post.findByIdAndUpdate(quotedPostId, { $inc: { repostCount: 1 } }),
        ]);

        if (originalPost && originalPost.userId.toString() !== (user?._id as unknown as string).toString()) {
          const author = await User.findById(originalPost.userId) as IUser | null;
          if (author) {
            // Fire notification + email in parallel
            await Promise.all([
              createNotification({
                recipientId: author._id as unknown as string,
                senderId: user._id as unknown as string,
                type: "quote",
                postId: newPost._id,
                message: `${user.name} quoted your thought: "${text.substring(0, 50)}${text.length > 50 ? "..." : ""}"`,
                url: `/post/${newPost._id}`
              }),
              author.email && author.preferences?.notifications !== false
                ? resend.emails.send({
                    from: "MindFuel <hello@mind-fuel.app>",
                    to: author.email,
                    subject: `${user.name} quoted your thought`,
                    react: (
                      <QuoteEmail
                        authorName={author.name}
                        quoterName={user.name}
                        quoteText={text}
                        originalPostText={originalPost.text}
                        postLink={`${process.env.NEXT_PUBLIC_BASE_URL || "https://mind-fuel.app"}/post/${newPost._id}`}
                      />
                    ) as React.ReactElement,
                  })
                : Promise.resolve(),
            ]);
          }
        }
      } catch (err) {
        console.error("Quote notification failed:", err);
      }
    }

    // Check & award new milestones
    let newMilestones: Array<{ id: string; label: string; emoji: string; description: string; tier: string }> = [];
    try {
      const totalPostCount = await Post.countDocuments({ userId: user._id });
      const existingMilestoneIds = (user.earnedMilestones || []).map((m: { id: string }) => m.id);
      const postHour = new Date().getHours();
      const isFirstPost = totalPostCount === 1;

      const newlyUnlocked = checkNewMilestones({
        existingMilestoneIds,
        totalPostCount,
        newStreakDays: updatedUser?.streakDays || 0,
        postHour,
        isFirstPost,
      });

      if (newlyUnlocked.length > 0) {
        const milestoneEntries = newlyUnlocked.map((id) => ({ id, earnedAt: new Date() }));
        await User.findByIdAndUpdate(user._id, { $push: { earnedMilestones: { $each: milestoneEntries } } });
        newMilestones = newlyUnlocked.map((id) => {
          const def = getMilestoneById(id);
          return { id, label: def?.label || id, emoji: def?.emoji || "🏅", description: def?.description || "", tier: def?.tier || "bronze" };
        });
      }
    } catch (err) {
      console.error("Milestone check failed:", err);
    }

    revalidateTag("feed");
    revalidateTag("public-profile");
    revalidateTag("public-post");
    revalidateTag("public-hashtag");

    return NextResponse.json(
      { 
        post: newPost,
        streak: {
          streakDays: updatedUser?.streakDays || 0,
          longestStreak: updatedUser?.longestStreak || 0,
        },
        newMilestones,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to create post", message: errorMessage },
      { status: 500 }
    );
  }
}
