import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import Post from "@/models/post";
import crypto from "crypto";

function getViewerIdentifier(req: NextRequest): string {
  // Try to get a meaningful identifier
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const ua = req.headers.get("user-agent") || "unknown";
  // Create a hash of IP + User-Agent for anonymous fingerprinting
  return crypto.createHash("sha256").update(`${ip}:${ua}`).digest("hex").slice(0, 16);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDB();
    const { id } = await params;

    // Parse body for optional userId
    let userId: string | null = null;
    try {
      const body = await req.json();
      userId = body?.userId || null;
    } catch {
      // No body sent — that's fine
    }

    // Determine viewer identifier: prefer authenticated userId, fallback to IP hash
    const viewerId = userId || getViewerIdentifier(req);

    // Check cookie first (fast path)
    const viewedCookie = req.cookies.get(`viewed_${id}`);
    if (viewedCookie) {
      const post = await Post.findById(id);
      return NextResponse.json({ views: post?.views || 0 }, { status: 200 });
    }

    // Check if viewer is in viewedBy array (DB-level dedup)
    const existingView = await Post.findOne({
      _id: id,
      viewedBy: viewerId,
    });

    if (existingView) {
      // Already viewed — set cookie and return
      const response = NextResponse.json({ views: existingView.views }, { status: 200 });
      response.cookies.set(`viewed_${id}`, "true", {
        maxAge: 60 * 60 * 24,
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });
      return response;
    }

    // New unique view — increment and track
    const post = await Post.findByIdAndUpdate(
      id,
      {
        $inc: { views: 1 },
        $addToSet: { viewedBy: viewerId },
      },
      { new: true }
    );

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const response = NextResponse.json({ views: post.views }, { status: 200 });
    response.cookies.set(`viewed_${id}`, "true", { 
      maxAge: 60 * 60 * 24, // 24 hours 
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict"
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
