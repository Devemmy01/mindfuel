import { MetadataRoute } from "next";
import { connectToDB } from "@/utils/database";
import Post from "@/models/post";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://mindfuel.app";

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "always",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
  ];

  // Dynamic post pages
  try {
    await connectToDB();
    const posts = await Post.find({})
      .select("_id createdAt updatedAt")
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    const postPages: MetadataRoute.Sitemap = posts.map((post) => ({
      url: `${baseUrl}/post/${post._id}`,
      lastModified: new Date(post.updatedAt || post.createdAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    return [...staticPages, ...postPages];
  } catch {
    return staticPages;
  }
}
