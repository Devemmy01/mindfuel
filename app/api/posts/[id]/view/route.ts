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

    // Determination of viewer identifier is already handled below.
    // We removed the cookie-based early return to ensure that 
    // fresh views can be recorded if the database allows it (e.g. after a reset).

    // Atomic check and update: only increment and add to set if not already present
    const post = await Post.findOneAndUpdate(
      { _id: id, viewedBy: { $ne: viewerId } },
      {
        $inc: { views: 1 },
        $addToSet: { viewedBy: viewerId },
      },
      { new: true }
    );

    if (!post) {
      // If no post found with this ID where user hasn't viewed, 
      // either post doesn't exist OR user already viewed.
      const existingPost = await Post.findById(id).select("views");
      if (!existingPost) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }
      
      // Already viewed — set cookie and return current views
      const response = NextResponse.json({ views: existingPost.views }, { status: 200 });
      response.cookies.set(`viewed_${id}`, "true", {
        maxAge: 60 * 60 * 24,
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });
      return response;
    }

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
