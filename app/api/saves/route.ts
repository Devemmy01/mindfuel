import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import Save from "@/models/save";
import User from "@/models/user";

// GET /api/saves?userId=... - Fetch saved posts for a user
export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const firebaseId = req.nextUrl.searchParams.get("userId");

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
        populate: { path: "userId", select: "name image firebaseId" }
      })
      .lean();

    return NextResponse.json({ saves }, { status: 200 });
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
