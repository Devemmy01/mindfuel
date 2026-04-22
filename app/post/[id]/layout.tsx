import { Metadata } from 'next'
import { connectToDB } from '@/utils/database'
import Post from '@/models/post'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.mind-fuel.app";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    await connectToDB();
    const post = await Post.findById(id).populate('userId', 'name').lean() as { text: string; createdAt: Date; userId: { name: string } } | null;
    
    if (!post) {
      return { title: 'Post Not Found | MindFuel' }
    }

    const truncate = (str: string, len: number) => str.length > len ? str.slice(0, len) + "…" : str;
    const title = `${post.userId.name}: "${truncate(post.text, 80)}" | MindFuel`;
    const description = `${post.userId.name} shared a thought on MindFuel: "${truncate(post.text, 150)}"`;
    const postUrl = `${baseUrl}/post/${id}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "article",
        url: postUrl,
        publishedTime: post.createdAt.toISOString(),
        authors: [post.userId.name],
        images: [
          {
            url: `${baseUrl}/post/${id}/opengraph-image`,
            width: 1200,
            height: 630,
            alt: `Thought by ${post.userId.name} on MindFuel`,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [`${baseUrl}/post/${id}/opengraph-image`],
      }
    }
  } catch {
    return { title: 'Thought | MindFuel' }
  }
}

export default function PostLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
