import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import Collection from "@/models/collection";
import User from "@/models/user";

// GET /api/collections?userId=... - Fetch collections for a user
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

    const collections = await Collection.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ collections }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch collections", message: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/collections - Create a collection
export async function POST(req: NextRequest) {
  try {
    await connectToDB();
    const { userId: firebaseId, name } = await req.json();

    if (!firebaseId || !name) {
      return NextResponse.json({ error: "userId and name are required" }, { status: 400 });
    }

    const user = await User.findOne({ firebaseId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const collection = await Collection.create({
      userId: user._id,
      name,
    });

    return NextResponse.json({ collection }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to create collection", message: errorMessage },
      { status: 500 }
    );
  }
}
