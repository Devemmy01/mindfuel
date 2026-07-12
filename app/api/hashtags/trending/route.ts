import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import { getTrendingHashtags } from "@/lib/hashtags";

export async function GET(req: NextRequest) {
  try {
    await connectToDB();

    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "10"), 20);
    const hashtags = await getTrendingHashtags(limit);

    return NextResponse.json(
      { hashtags },
      { status: 200, headers: { "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=86400" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to fetch trending hashtags", message }, { status: 500 });
  }
}
