import { connectToDB } from "@/utils/database";
import Post from "@/models/post";
import "@/models/user"; // Required to register the User schema before Post.populate
import { PostType } from "@/types";
import FeedClient from "@/components/FeedClient";

// Cache the global feed and regenerate it every 30 seconds (ISR)
export const revalidate = 30;

export default async function Home() {
  let initialPosts: PostType[] = [];
  let hasMore = false;

  try {
    await connectToDB();

    // SSR: fetch the first page server-side for instant FCP
    let posts = await Post.aggregate([
      { $match: {} },
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
      { $limit: 10 },
    ]);

    posts = await Post.populate(posts, {
      path: "userId",
      select: "name image firebaseId",
    });

    // Filter out posts with deleted users and serialize for client
    initialPosts = JSON.parse(
      JSON.stringify(
        (posts as unknown as PostType[]).filter((p) => p.userId)
      )
    );

    const total = await Post.countDocuments({});
    hasMore = total > initialPosts.length;
  } catch (error) {
    console.error("SSR feed fetch failed:", error);
  }

  return (
    <div className="flex flex-col w-full min-h-screen">
      <FeedClient initialPosts={initialPosts} initialHasMore={hasMore} />
    </div>
  );
}
