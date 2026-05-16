import Hashtag from "@/models/hashtag";
import PostHashtag from "@/models/postHashtag";
import Post from "@/models/post";
import { extractHashtags, levenshteinDistance, normalizeHashtag } from "@/lib/hashtags-core";

export { formatHashtag, hashtagTextToPath, levenshteinDistance, normalizeHashtag, extractHashtags } from "@/lib/hashtags-core";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function getTrendingHashtags(limit = 10) {
  const hashtags = await PostHashtag.aggregate([
    {
      $lookup: {
        from: Hashtag.collection.name,
        localField: "hashtagId",
        foreignField: "_id",
        as: "hashtag",
      },
    },
    { $unwind: "$hashtag" },
    {
      $lookup: {
        from: Post.collection.name,
        localField: "postId",
        foreignField: "_id",
        as: "post",
      },
    },
    { $unwind: "$post" },
    {
      $addFields: {
        ageHours: {
          $divide: [{ $subtract: [new Date(), "$createdAt"] }, 3600000],
        },
        engagementScore: {
          $add: [
            { $multiply: [{ $ifNull: ["$post.likesCount", 0] }, 0.35] },
            { $multiply: [{ $ifNull: ["$post.commentsCount", 0] }, 0.5] },
            { $multiply: [{ $ifNull: ["$post.repostCount", 0] }, 0.45] },
            { $multiply: [{ $ifNull: ["$post.views", 0] }, 0.02] },
          ],
        },
      },
    },
    {
      $addFields: {
        decayScore: {
          $divide: [1, { $pow: [{ $add: [{ $ifNull: ["$ageHours", 0] }, 1] }, 1.15] }],
        },
      },
    },
    {
      $group: {
        _id: "$hashtagId",
        tag: { $first: "$hashtag.tag" },
        displayTag: { $first: "$hashtag.displayTag" },
        postCount: { $sum: 1 },
        lastUsedAt: { $max: "$createdAt" },
        engagementScore: { $sum: "$engagementScore" },
        decayScore: { $sum: "$decayScore" },
      },
    },
    {
      $addFields: {
        trendScore: {
          $add: [
            { $multiply: ["$engagementScore", 1.2] },
            { $multiply: ["$decayScore", 12] },
            { $multiply: ["$postCount", 1.5] },
          ],
        },
      },
    },
    { $sort: { trendScore: -1, lastUsedAt: -1 } },
    { $limit: limit },
  ]);

  return hashtags.map((hashtag: { tag: string; displayTag: string; postCount: number; lastUsedAt: Date; trendScore: number }) => ({
    tag: hashtag.tag,
    displayTag: hashtag.displayTag,
    postCount: hashtag.postCount,
    lastUsedAt: hashtag.lastUsedAt,
    trendScore: hashtag.trendScore,
  }));
}

export async function searchHashtags(query: string, limit = 10) {
  const normalizedQuery = normalizeHashtag(query);
  if (!normalizedQuery) {
    return getTrendingHashtags(limit);
  }

  const prefix = escapeRegex(normalizedQuery.slice(0, 3));
  const searchCandidates = await Hashtag.find({
    $or: [
      { tag: { $regex: escapeRegex(normalizedQuery), $options: "i" } },
      { tag: { $regex: `^${prefix}`, $options: "i" } },
    ],
  })
    .sort({ postCount: -1, lastUsedAt: -1 })
    .limit(50)
    .lean();

  const fallbackCandidates = searchCandidates.length > 0
    ? searchCandidates
    : await Hashtag.find({}).sort({ postCount: -1, lastUsedAt: -1 }).limit(50).lean();

  const postCandidates = await Post.find({
    $or: [
      { hashtags: normalizedQuery },
      { hashtags: { $in: [normalizedQuery] } },
      { text: { $regex: `(?:^|[^\\w])#${escapeRegex(normalizedQuery)}`, $options: "i" } },
    ],
  })
    .select("hashtags text createdAt likesCount commentsCount repostCount views")
    .lean();

  const postDerivedCandidates = new Map<string, {
    tag: string;
    displayTag: string;
    postCount: number;
    lastUsedAt: Date | null;
    score: number;
  }>();

  for (const post of postCandidates) {
    const tags = Array.isArray(post.hashtags) && post.hashtags.length > 0
      ? post.hashtags
      : extractHashtags(post.text || "");

    for (const tag of tags) {
      const distance = levenshteinDistance(normalizedQuery, tag);
      const startsWith = tag.startsWith(normalizedQuery) ? -2 : 0;
      const contains = tag.includes(normalizedQuery) ? -1 : 0;
      const popularity = Math.min((post.likesCount || 0) / 10 + (post.commentsCount || 0) / 10 + (post.repostCount || 0) / 10 + (post.views || 0) / 1000, 3);
      const score = distance + startsWith + contains - popularity;

      const existing = postDerivedCandidates.get(tag);
      if (existing) {
        existing.postCount += 1;
        if (!existing.lastUsedAt || (post.createdAt && new Date(post.createdAt) > existing.lastUsedAt)) {
          existing.lastUsedAt = post.createdAt ? new Date(post.createdAt) : existing.lastUsedAt;
        }
        existing.score = Math.min(existing.score, score);
      } else {
        postDerivedCandidates.set(tag, {
          tag,
          displayTag: `#${tag}`,
          postCount: 1,
          lastUsedAt: post.createdAt ? new Date(post.createdAt) : null,
          score,
        });
      }
    }
  }

  const merged = new Map<string, {
    tag: string;
    displayTag: string;
    postCount: number;
    lastUsedAt: Date | null;
    score: number;
  }>();

  for (const hashtag of fallbackCandidates) {
    const distance = levenshteinDistance(normalizedQuery, hashtag.tag);
    const startsWith = hashtag.tag.startsWith(normalizedQuery) ? -2 : 0;
    const contains = hashtag.tag.includes(normalizedQuery) ? -1 : 0;
    const popularity = Math.min((hashtag.postCount || 0) / 15, 3);
    const score = distance + startsWith + contains - popularity;
    merged.set(hashtag.tag, {
      tag: hashtag.tag,
      displayTag: hashtag.displayTag,
      postCount: hashtag.postCount || 0,
      lastUsedAt: hashtag.lastUsedAt || null,
      score,
    });
  }

  for (const [tag, candidate] of postDerivedCandidates.entries()) {
    const existing = merged.get(tag);
    if (!existing || candidate.score < existing.score) {
      merged.set(tag, candidate);
    } else if (existing) {
      existing.postCount = Math.max(existing.postCount, candidate.postCount);
      if (!existing.lastUsedAt || (candidate.lastUsedAt && candidate.lastUsedAt > existing.lastUsedAt)) {
        existing.lastUsedAt = candidate.lastUsedAt;
      }
    }
  }

  return Array.from(merged.values())
    .filter((item) => item.score <= Math.max(6, normalizedQuery.length + 3))
    .sort((a, b) => a.score - b.score || b.postCount - a.postCount || a.tag.localeCompare(b.tag))
    .slice(0, limit);
}

export async function syncPostHashtags({
  postId,
  nextText,
  previousTags = [],
}: {
  postId: string;
  nextText: string;
  previousTags?: string[];
}): Promise<string[]> {
  const nextTags = extractHashtags(nextText);
  const nextSet = new Set(nextTags);
  const previousSet = new Set(previousTags.map(normalizeHashtag));

  const addedTags = nextTags.filter((tag) => !previousSet.has(tag));
  const removedTags = previousTags
    .map(normalizeHashtag)
    .filter((tag) => !nextSet.has(tag));

  const now = new Date();
  const allTags = Array.from(new Set([...nextTags, ...previousTags.map(normalizeHashtag)]));

  const ensureHashtagDoc = async (tag: string) => {
    return Hashtag.findOneAndUpdate(
      { tag },
      {
        $setOnInsert: {
          tag,
          displayTag: `#${tag}`,
          postCount: 0,
          usageCount: 0,
          lastUsedAt: now,
        },
      },
      { upsert: true, new: true }
    );
  };

  const hashtagDocs = await Promise.all(allTags.map((tag) => ensureHashtagDoc(tag)));
  const hashtagIdByTag = new Map(hashtagDocs.map((doc) => [doc.tag, doc._id]));

  if (addedTags.length > 0) {
    await Promise.all(
      addedTags.map((tag) =>
        Promise.all([
          Hashtag.updateOne(
            { tag },
            {
              $inc: { postCount: 1, usageCount: 1 },
              $set: { lastUsedAt: now },
            }
          ),
          PostHashtag.updateOne(
            { postId, hashtagId: hashtagIdByTag.get(tag) },
            { $setOnInsert: { postId, hashtagId: hashtagIdByTag.get(tag) } },
            { upsert: true }
          ),
        ])
      )
    );
  }

  if (removedTags.length > 0) {
    const removedHashtagIds = removedTags
      .map((tag) => hashtagIdByTag.get(tag))
      .filter(Boolean);

    if (removedHashtagIds.length > 0) {
      await Promise.all([
        PostHashtag.deleteMany({ postId, hashtagId: { $in: removedHashtagIds } }),
        ...removedTags.map((tag) => Hashtag.updateOne({ tag }, { $inc: { postCount: -1 } })),
      ]);
    }
  }

  if (nextTags.length > 0) {
    await PostHashtag.deleteMany({ postId, hashtagId: { $nin: nextTags.map((tag) => hashtagIdByTag.get(tag)).filter(Boolean) } });
  } else {
    await PostHashtag.deleteMany({ postId });
  }

  return nextTags;
}