import { MetadataRoute } from "next";
import { connectToDB } from "@/utils/database";
import Post from "@/models/post";
import Hashtag from "@/models/hashtag";
import User from "@/models/user";
import { siteUrl } from "@/lib/seo";
import { guides } from "@/lib/guides";

// The sitemap includes live community content. Generate it at request time so a
// temporary database outage during deployment cannot bake an incomplete file.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const contentUpdatedAt = new Date("2026-06-23");

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: contentUpdatedAt,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${siteUrl}/guides`,
      lastModified: contentUpdatedAt,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: contentUpdatedAt,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified: contentUpdatedAt,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/cookies`,
      lastModified: contentUpdatedAt,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  staticPages.push(
    ...guides.map((guide) => ({
      url: `${siteUrl}/guides/${guide.slug}`,
      lastModified: new Date(guide.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.85,
    })),
  );

  try {
    await connectToDB();
    const [posts, hashtags] = await Promise.all([
      Post.find({
        text: { $regex: /[\s\S]{80}/ },
        $or: [
          { scheduledAt: null },
          { scheduledAt: { $exists: false } },
          { scheduledAt: { $lte: now } },
        ],
      })
        .select("_id userId createdAt updatedAt")
        .sort({ createdAt: -1 })
        .limit(5000)
        .lean(),
      Hashtag.find({ postCount: { $gte: 2 } })
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

    const authorIds = [...new Set(posts.map((post) => post.userId?.toString()).filter(Boolean))];
    const authors = await User.find({ _id: { $in: authorIds } })
      .select("firebaseId updatedAt")
      .lean();
    const profilePages: MetadataRoute.Sitemap = authors.map((author) => ({
      url: `${siteUrl}/profile/${encodeURIComponent(author.firebaseId)}`,
      lastModified: new Date(author.updatedAt || now),
      changeFrequency: "weekly" as const,
      priority: 0.65,
    }));

    return [...staticPages, ...hashtagPages, ...profilePages, ...postPages];
  } catch {
    return staticPages;
  }
}
