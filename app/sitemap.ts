import { MetadataRoute } from "next";
import { connectToDB } from "@/utils/database";
import Post from "@/models/post";
import Hashtag from "@/models/hashtag";
import { siteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${siteUrl}/search`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/cookies`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  try {
    await connectToDB();
    const [posts, hashtags] = await Promise.all([
      Post.find({})
        .select("_id createdAt updatedAt")
        .sort({ createdAt: -1 })
        .limit(1000)
        .lean(),
      Hashtag.find({ postCount: { $gt: 0 } })
        .select("tag updatedAt lastUsedAt")
        .sort({ postCount: -1, lastUsedAt: -1 })
        .limit(200)
        .lean(),
    ]);

    const postPages: MetadataRoute.Sitemap = posts.map((post) => ({
      url: `${siteUrl}/post/${post._id}`,
      lastModified: new Date(post.updatedAt || post.createdAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    const hashtagPages: MetadataRoute.Sitemap = hashtags.map((hashtag) => ({
      url: `${siteUrl}/hashtags/${encodeURIComponent(hashtag.tag)}`,
      lastModified: new Date(hashtag.lastUsedAt || hashtag.updatedAt || now),
      changeFrequency: "daily" as const,
      priority: 0.7,
    }));

    return [...staticPages, ...hashtagPages, ...postPages];
  } catch {
    return staticPages;
  }
}
