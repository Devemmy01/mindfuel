import { Metadata } from "next";

interface PostPageProps {
  params: Promise<{ id: string }>;
}

async function getPost(id: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mind-fuel.app';
  try {
    const res = await fetch(`${baseUrl}/api/posts/${id}`, { cache: 'no-store' });
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
      description: "Read this mindful reflection on MindFuel.",
    };
  }

  const post = data.post;
  const authorName = post.userId?.name || "Someone";
  const excerpt = post.text.slice(0, 160).replace(/Reflecting on: "[^"]+"\s*/, "") + "...";

  return {
    title: `${authorName}'s Reflection | MindFuel`,
    description: excerpt,
    openGraph: {
      title: `${authorName}'s Reflection on MindFuel`,
      description: excerpt,
      type: "article",
      images: [
        {
          url: post.imageUrl || "/og-image.png",
          width: 1200,
          height: 630,
          alt: `${authorName}'s Reflection`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${authorName}'s Reflection | MindFuel`,
      description: excerpt,
      images: [post.imageUrl || "/og-image.png"],
    },
  };
}

export default function PostLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
