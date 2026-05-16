import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import { searchHashtags } from "@/lib/hashtags";

export async function GET(req: NextRequest) {
  try {
    await connectToDB();

    const query = req.nextUrl.searchParams.get("q") || "";
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "10"), 20);
    const hashtags = await searchHashtags(query, limit);

    return NextResponse.json({ hashtags }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to search hashtags", message }, { status: 500 });
  }
}