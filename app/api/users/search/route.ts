import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import User from "@/models/user";

export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const query = req.nextUrl.searchParams.get("q");

    if (!query || query.length < 2) {
      return NextResponse.json({ users: [] }, { status: 200 });
    }

    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { username: { $regex: query, $options: "i" } }
      ]
    })
      .limit(5)
      .select("name image firebaseId username")
      .lean();

    return NextResponse.json({ users }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to search users", message: errorMessage },
      { status: 500 }
    );
  }
}
