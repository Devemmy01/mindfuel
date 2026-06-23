import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PostDetailClient from "@/components/PostDetailClient";
import { getPublicPost } from "@/lib/public-content";
import { absoluteUrl, defaultOgImage, siteDescription } from "@/lib/seo";

interface PostPageProps { params: Promise<{ id: string }> }

function cleanPostText(text: string) {
  return text.replace(/Reflecting on: "[^"]+"\s*/, "").replace(/\s+/g, " ").trim();
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { id } = await params;
  const post = await getPublicPost(id);
  if (!post) {
    return { title: "Reflection not found", description: siteDescription, robots: { index: false, follow: false } };
  }

  const authorName = post.userId?.name || "A MindFuel member";
  const cleanText = cleanPostText(post.text || "");
  const description = cleanText.length > 158 ? `${cleanText.slice(0, 155)}…` : cleanText;
  const titleText = cleanText.length > 62 ? `${cleanText.slice(0, 59)}…` : cleanText;
  const image = post.imageUrl || defaultOgImage;
  const canonical = absoluteUrl(`/post/${id}`);

  return {
    title: `${titleText || "A reflection"} — ${authorName}`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${authorName}'s reflection on MindFuel`,
      description,
      type: "article",
      url: canonical,
      publishedTime: post.createdAt,
      modifiedTime: post.updatedAt,
      authors: [authorName],
      images: [{ url: image, alt: `${authorName}'s reflection on MindFuel` }],
    },
    twitter: { card: "summary_large_image", title: `${authorName}'s reflection`, description, images: [image] },
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { id } = await params;
  const post = await getPublicPost(id);
  if (!post) notFound();

  const cleanText = cleanPostText(post.text || "");
  const canonical = absoluteUrl(`/post/${id}`);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    "@id": `${canonical}#posting`,
    url: canonical,
    headline: cleanText.slice(0, 110),
    articleBody: cleanText,
    datePublished: post.createdAt,
    dateModified: post.updatedAt || post.createdAt,
    author: {
      "@type": "Person",
      name: post.userId.name,
      url: absoluteUrl(`/profile/${post.userId.firebaseId}`),
    },
    image: post.imageUrl || undefined,
    interactionStatistic: [
      { "@type": "InteractionCounter", interactionType: "https://schema.org/LikeAction", userInteractionCount: post.likesCount || 0 },
      { "@type": "InteractionCounter", interactionType: "https://schema.org/CommentAction", userInteractionCount: post.commentsCount || 0 },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PostDetailClient initialPost={post} />
    </>
  );
}
