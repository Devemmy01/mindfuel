import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import Post from "@/models/post";
import crypto from "crypto";

function getViewerIdentifier(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const ua = req.headers.get("user-agent") || "unknown";
  return crypto.createHash("sha256").update(`${ip}:${ua}`).digest("hex").slice(0, 16);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // 1. COOKIE FAST PATH — zero DB queries if user already viewed in last 24 h
    if (req.cookies.has(`viewed_${id}`)) {
      return NextResponse.json({ message: "Already viewed" }, { status: 200 });
    }

    await connectToDB();

    // 2. Determine viewer identifier
    let userId: string | null = null;
    try {
      const body = await req.json();
      userId = body?.userId || null;
    } catch {
      // No body — that's fine
    }
    const viewerId = userId || getViewerIdentifier(req);

    // 3. Single atomic update: only writes if viewerId not already in viewedBy array
    const updated = await Post.findOneAndUpdate(
      { _id: id, viewedBy: { $ne: viewerId } },
      { $inc: { views: 1 }, $addToSet: { viewedBy: viewerId } },
      { new: true, select: "views" }
    );

    // 4. Build response and set viewed cookie (24 h, so the cookie fast-path fires next time)
    const views = updated?.views;
    const response = NextResponse.json({ views }, { status: 200 });
    response.cookies.set(`viewed_${id}`, "1", {
      maxAge: 60 * 60 * 24,
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return response;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to increment views", message: errorMessage },
      { status: 500 }
    );
  }
}
