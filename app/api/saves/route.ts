import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import Save from "@/models/save";
import User, { IUser } from "@/models/user";
import Like from "@/models/like";
import Post from "@/models/post";
import { PostType } from "@/types";
import { createNotification } from "@/lib/notifications";
import { Types } from "mongoose";

// GET /api/saves?userId=... - Fetch saved posts for a user
export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const firebaseId = req.nextUrl.searchParams.get("userId");
    const currentUserId = req.nextUrl.searchParams.get("currentUserId");

    if (!firebaseId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const user = (await User.findOne({ firebaseId })) as IUser | null;
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const collectionId = req.nextUrl.searchParams.get("collectionId");
    const postId = req.nextUrl.searchParams.get("postId");
    const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get("limit") || 100), 1), 100);
    const page = Math.max(Number(req.nextUrl.searchParams.get("page") || 1), 1);
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { userId: user._id };
    if (collectionId) {
      // Handle the case where we want default saves (null collectionId)
      query.collectionId = collectionId === "null" ? null : collectionId;
    }
    if (postId && Types.ObjectId.isValid(postId)) query.postId = postId;

    const [saves, total] = await Promise.all([
      Save.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "postId",
        populate: [
          { path: "userId", select: "name username image firebaseId" },
          {
            path: "quotedPostId",
            populate: [
              { path: "userId", select: "name username image firebaseId" },
              { 
                path: "quotedPostId", 
                populate: { path: "userId", select: "name username image firebaseId" }
              }
            ]
          }
        ]
      })
      .lean(),
      Save.countDocuments(query),
    ]);
    
    // Transform saves to include interaction status if currentUserId is provided
    let likedPostIds: Set<string> = new Set();
    let savedPostIds: Set<string> = new Set();

    if (currentUserId && saves.length > 0) {
      const currentUserDoc = await User.findOne({ firebaseId: currentUserId }).select("_id").lean() as { _id: string } | null;
      if (currentUserDoc) {
        const postIds = (saves as Array<{ postId?: { _id: string } }>).map((s) => s.postId?._id).filter(Boolean);
        const [likes, allSaves] = await Promise.all([
          Like.find({ userId: currentUserDoc._id, postId: { $in: postIds } }).select("postId").lean().exec() as unknown as Promise<Array<{ postId: { toString(): string } }>>,
          Save.find({ userId: currentUserDoc._id, postId: { $in: postIds } }).select("postId").lean().exec() as unknown as Promise<Array<{ postId: { toString(): string } }>>
        ]);
        likedPostIds = new Set(likes.map((l) => l.postId.toString()));
        savedPostIds = new Set(allSaves.map((s) => s.postId.toString()));
      }
    }

    const enrichedSaves = (saves as Array<{ postId?: PostType }>).map((save) => {
      if (!save.postId) return save;
      
      const p = save.postId as unknown as PostType & { quotedPostId: unknown };
      let quotedPostData = undefined;

      if (p.quotedPostId !== undefined && p.quotedPostId !== null) {
        if (typeof p.quotedPostId === "object" && p.quotedPostId !== null) {
          const quotedDoc = p.quotedPostId as PostType;
          quotedPostData = {
            ...quotedDoc,
            quotedPost: (quotedDoc as unknown as { quotedPostId: PostType }).quotedPostId,
          };
        } else {
          quotedPostData = null;
        }
      } else if (p.quotedPostId === null) {
        quotedPostData = null;
      }

      return {
        ...save,
        postId: {
          ...save.postId,
          quotedPost: quotedPostData,
          isLiked: likedPostIds.has(save.postId._id.toString()),
          isSaved: savedPostIds.has(save.postId._id.toString())
        }
      };
    });

    return NextResponse.json(
      { saves: enrichedSaves, total, hasMore: skip + saves.length < total, page },
      { status: 200, headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch saves", message: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/saves - Toggle save post
export async function POST(req: NextRequest) {
  try {
    await connectToDB();
    const { userId: firebaseId, postId, collectionId, note } = await req.json();

    if (!firebaseId || !postId) {
      return NextResponse.json(
        { error: "firebaseId and postId are required" },
        { status: 400 }
      );
    }

    const user = (await User.findOne({ firebaseId })) as IUser | null;
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existingSave = await Save.findOne({ userId: user._id, postId });

    if (existingSave) {
      // Toggle unsave
      await Save.deleteOne({ _id: existingSave._id });
      return NextResponse.json({ saved: false }, { status: 200 });
    } else {
      // Toggle save
      const save = await Save.create({
        userId: user._id,
        postId,
        collectionId: collectionId || null,
        note: note || "",
      });

      // Notify post author
      try {
        const post = await Post.findById(postId);
        if (post && post.userId && post.userId.toString() !== (user?._id as unknown as string).toString()) {
          await createNotification({
            recipientId: post.userId as unknown as string,
            senderId: user._id as unknown as string,
            type: "save",
            postId: new Types.ObjectId(postId),
            message: `${user.name} saved your thought to their library`,
            url: `/post/${postId}`
          });
        }
      } catch (notifErr) {
        console.error("Save notification failed:", notifErr);
      }

      return NextResponse.json({ saved: true, save }, { status: 201 });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to toggle save", message: errorMessage },
      { status: 500 }
    );
  }
}
