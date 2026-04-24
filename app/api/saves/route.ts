import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import Save from "@/models/save";
import User from "@/models/user";
import Like from "@/models/like";

// GET /api/saves?userId=... - Fetch saved posts for a user
export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const firebaseId = req.nextUrl.searchParams.get("userId");
    const currentUserId = req.nextUrl.searchParams.get("currentUserId");

    if (!firebaseId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const user = await User.findOne({ firebaseId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const collectionId = req.nextUrl.searchParams.get("collectionId");

    const query: Record<string, unknown> = { userId: user._id };
    if (collectionId) {
      // Handle the case where we want default saves (null collectionId)
      query.collectionId = collectionId === "null" ? null : collectionId;
    }

    const saves = await Save.find(query)
      .sort({ createdAt: -1 })
      .populate({
        path: "postId",
        populate: { path: "userId", select: "name username image firebaseId" }
      })
      .lean();
    
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

    const enrichedSaves = (saves as Array<{ postId?: { _id: { toString(): string } } }>).map((save) => {
      if (!save.postId) return save;
      return {
        ...save,
        postId: {
          ...save.postId,
          isLiked: likedPostIds.has(save.postId._id.toString()),
          isSaved: savedPostIds.has(save.postId._id.toString())
        }
      };
    });

    return NextResponse.json({ saves: enrichedSaves }, { status: 200 });
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

    const user = await User.findOne({ firebaseId });
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
