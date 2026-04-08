import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import Post from "@/models/post";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDB();
    const { id } = await params;

    const viewedCookie = req.cookies.get(`viewed_${id}`);
    
    if (viewedCookie) {
      const post = await Post.findById(id);
      return NextResponse.json({ views: post?.views || 0 }, { status: 200 });
    }

    const post = await Post.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
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
