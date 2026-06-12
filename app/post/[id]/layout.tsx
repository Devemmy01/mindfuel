import { Metadata } from "next";
import { absoluteUrl, defaultOgImage, siteDescription } from "@/lib/seo";

interface PostPageProps {
  params: Promise<{ id: string }>;
}

async function getPost(id: string) {
  try {
    const res = await fetch(absoluteUrl(`/api/posts/${id}`), { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getPost(id);
  
  if (!data || !data.post) {
    return {
      title: "Reflection | MindFuel",
      description: siteDescription,
      alternates: {
        canonical: absoluteUrl(`/post/${id}`),
      },
    };
  }

  const post = data.post;
  const authorName = post.userId?.name || "Someone";
  const cleanText = String(post.text || "")
    .replace(/Reflecting on: "[^"]+"\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
  const excerpt = cleanText.length > 157 ? `${cleanText.slice(0, 157)}...` : cleanText;
  const title = `${authorName}'s reflection: ${cleanText.slice(0, 58)}${cleanText.length > 58 ? "..." : ""}`;
  const image = post.imageUrl || defaultOgImage;

  return {
    title,
    description: excerpt,
    alternates: {
      canonical: absoluteUrl(`/post/${id}`),
    },
    openGraph: {
      title: `${authorName}'s reflection on MindFuel`,
      description: excerpt,
      type: "article",
      url: absoluteUrl(`/post/${id}`),
      publishedTime: post.createdAt,
      modifiedTime: post.updatedAt,
      authors: [authorName],
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: `${authorName}'s reflection on MindFuel`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${authorName}'s reflection | MindFuel`,
      description: excerpt,
      images: [image],
    },
  };
}

export default function PostLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
