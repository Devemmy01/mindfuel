import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import Post from "@/models/post";
import User from "@/models/user";
import Like from "@/models/like";

// GET /api/posts - Fetch feed or user posts
export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const firebaseId = req.nextUrl.searchParams.get("userId");
    const type = req.nextUrl.searchParams.get("type"); // 'liked' or null (default)
    const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    let query: Record<string, unknown> = {};
    
    if (firebaseId) {
      const user = await User.findOne({ firebaseId });
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      if (type === "liked") {
        const likedDocs = await Like.find({ userId: user._id }).select("postId").lean();
        const postIds = likedDocs.map(l => l.postId);
        query = { _id: { $in: postIds } };
      } else {
        query = { userId: user._id };
      }
    } else {
      // Mindfeed: Show all posts, sorted by recent (removing 24h barrier)
      query = {};
    }
    
    let posts;
    let total;

    if (!firebaseId) {
      // Global Mindfeed: Use Calm Decay Scoring
      posts = await Post.aggregate([
        { $match: query },
        {
          $addFields: {
            ageInHours: {
              $divide: [
                { $subtract: [new Date(), "$createdAt"] },
                3600000,
              ],
            },
          },
        },
        {
          $addFields: {
            score: {
              $divide: [
                {
                  $add: [
                    { $multiply: [{ $ln: { $add: ["$likesCount", 1] } }, 2] },
                    { $ln: { $add: ["$views", 1] } },
                  ],
                },
                { $pow: [{ $add: ["$ageInHours", 2] }, 1.5] },
              ],
            },
          },
        },
        { $sort: { score: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      ]);

      // Populate userId for aggregated results
      posts = await Post.populate(posts, {
        path: "userId",
        select: "name image firebaseId",
      });

      // Filter out posts where userId is null (deleted users)
      posts = posts.filter((p: any) => p.userId);

      total = await Post.countDocuments(query);
    } else {
      // Profile or Liked feed: Keep simple chronological sort
      posts = await Post.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "name image firebaseId")
        .lean();
      
      // Filter out posts where userId is null (deleted users)
      posts = posts.filter((p: any) => p.userId);
      
      total = await Post.countDocuments(query);
    }

    const hasMore = total > skip + posts.length;

    return NextResponse.json({ posts, hasMore, total }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch posts", message: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/posts - Create post
export async function POST(req: NextRequest) {
  try {
    await connectToDB();
    const { text, userId: firebaseId, backgroundStyle, fontFamily, isSponsored } = await req.json();

    if (!text || !firebaseId) {
      return NextResponse.json(
        { error: "Text and firebaseId are required" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ firebaseId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const newPost = await Post.create({
      text,
      userId: user._id,
      backgroundStyle,
      fontFamily: fontFamily || "inter",
      isSponsored: isSponsored || false,
      views: 0,
      likesCount: 0,
    });

    return NextResponse.json({ post: newPost }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to create post", message: errorMessage },
      { status: 500 }
    );
  }
}
