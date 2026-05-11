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
        .populate("userId", "name username image firebaseId")
        .populate({
          path: "quotedPostId",
          populate: [
            { path: "userId", select: "name username image firebaseId" },
            { 
              path: "quotedPostId", 
              populate: { path: "userId", select: "name username image firebaseId" }
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
    } else {
      // Profile or Liked feed: fetch matches
      const rawPosts = await Post.find(query)
        .populate("userId", "name username image firebaseId")
        .populate({
          path: "quotedPostId",
          populate: [
            { path: "userId", select: "name username image firebaseId" },
            { 
              path: "quotedPostId", 
              populate: { path: "userId", select: "name username image firebaseId" }
            }
          ]
        })
        .lean();
      
      // Filter out posts where userId is null (deleted users)
      validPosts = (rawPosts as unknown as PostType[]).filter((p) => p.userId);

      // Attach repost info for profile feed
      if (type !== "liked" && queryUser) {
        const repostDocs = await Repost.find({ userId: queryUser._id }).lean() as unknown as Array<{ postId: { toString(): string }, createdAt: Date }>;
        const repostMap = new Map(repostDocs.map(r => [r.postId.toString(), true]));
        
        validPosts = validPosts.map(post => {
          if (repostMap.has(post._id.toString())) {
            return {
              ...post,
              isRepost: true,
              repostedBy: {
                name: queryUser.name,
                username: queryUser.username,
                firebaseId: queryUser.firebaseId
              }
            };
          }
          return post;
        });
        
        // Sort by repost date if it's a repost, otherwise post date
        validPosts.sort((a, b) => {
          let dateA = new Date(a.createdAt).getTime();
          if (a.isRepost) {
             const r = repostDocs.find(rd => rd.postId.toString() === a._id.toString());
             if (r) dateA = new Date(r.createdAt).getTime();
          }
          let dateB = new Date(b.createdAt).getTime();
          if (b.isRepost) {
             const r = repostDocs.find(rd => rd.postId.toString() === b._id.toString());
             if (r) dateB = new Date(r.createdAt).getTime();
          }
          return dateB - dateA;
        });
      } else {
        validPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      
      // Apply pagination manually after sorting
      total = validPosts.length;
      validPosts = validPosts.slice(skip, skip + limit);
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

    return NextResponse.json({ posts: enrichedPosts, hasMore, total }, { status: 200 });
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

    // Update user's reflection streak
    const streakUpdate = updateStreak(
      user.lastReflectionDate,
      user.streakDays || 0,
      user.longestStreak || 0
    );

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      streakUpdate,
      { new: true }
    );

    // Handle Quote Repost Notifications & Counts
    if (quotedPostId) {
      try {
        // Increment repostCount on original post
        await Post.findByIdAndUpdate(quotedPostId, { $inc: { repostCount: 1 } });

        const originalPost = await Post.findById(quotedPostId);
        if (originalPost && originalPost.userId.toString() !== (user?._id as unknown as string).toString()) {
          const author = await User.findById(originalPost.userId) as IUser | null;
          if (author) {
             // 1. In-App Notification
              await createNotification({
                recipientId: author._id as unknown as string,
                senderId: user._id as unknown as string,
               type: "quote",
               postId: newPost._id,
               message: `${user.name} quoted your thought: "${text.substring(0, 50)}${text.length > 50 ? "..." : ""}"`,
               url: `/post/${newPost._id}`
             });

             // 2. Email Notification
             if (author.email && author.preferences?.notifications !== false) {
               await resend.emails.send({
                 from: "MindFuel <noreply@mind-fuel.app>",
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
               });
             }
          }
        }
      } catch (err) {
        console.error("Quote notification failed:", err);
      }
    }

    return NextResponse.json(
      { 
        post: newPost,
        streak: {
          streakDays: updatedUser?.streakDays || 0,
          longestStreak: updatedUser?.longestStreak || 0,
        }
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
