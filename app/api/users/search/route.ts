import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import User from "@/models/user";
import Follow from "@/models/follow";

export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const query = req.nextUrl.searchParams.get("q");

    if (!query || query.length < 2) {
      const viewerId = req.nextUrl.searchParams.get("viewerId");
      if (!viewerId) return NextResponse.json({ users: [] }, { status: 200 });
      const viewer = await User.findOne({ firebaseId: viewerId }).select("_id");
      if (!viewer) return NextResponse.json({ users: [] }, { status: 200 });
      const existing = await Follow.find({ follower: viewer._id }).select("following").lean();
      const excluded = [viewer._id, ...existing.map((item) => item.following)];
      const users = await User.find({ _id: { $nin: excluded } }).sort({ createdAt: -1 }).limit(4).select("name image firebaseId username bio").lean();
      return NextResponse.json(
        { users },
        { status: 200, headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" } }
      );
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

    return NextResponse.json(
      { users },
      { status: 200, headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to search users", message: errorMessage },
      { status: 500 }
    );
  }
}
