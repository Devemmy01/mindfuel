import { Metadata } from 'next'
import { connectToDB } from '@/utils/database'
import Post from '@/models/post'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    await connectToDB();
    const post = await Post.findById(id).populate('userId', 'name').lean() as any;
    
    if (!post) {
      return { title: 'Post Not Found | MindFuel' }
    }

    const truncate = (str: string, len: number) => str.length > len ? str.slice(0, len) + "…" : str;
    const title = `${post.userId.name}: "${truncate(post.text, 80)}" | MindFuel`;
    const description = `${post.userId.name} shared a thought on MindFuel: "${truncate(post.text, 150)}"`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "article",
        publishedTime: post.createdAt,
        authors: [post.userId.name],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      }
    }
  } catch (err) {
    return { title: 'Thought | MindFuel' }
  }
}

export default function PostLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
