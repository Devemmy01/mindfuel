import type { Metadata } from "next";
import HashtagFeedClient from "@/components/HashtagFeedClient";
import { absoluteUrl, defaultOgImage } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag).replace(/^#/, "");
  const displayTag = `#${decodedTag}`;
  const title = `${displayTag} reflections and personal growth posts`;
  const description = `Read MindFuel reflections, lessons, and daily journal entries tagged ${displayTag}. Explore thoughtful posts about growth, learning, and mindful living.`;

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(`/hashtags/${encodeURIComponent(decodedTag)}`),
    },
    openGraph: {
      title: `${displayTag} reflections on MindFuel`,
      description,
      url: absoluteUrl(`/hashtags/${encodeURIComponent(decodedTag)}`),
      images: [
        {
          url: defaultOgImage,
          width: 1200,
          height: 630,
          alt: `${displayTag} reflections on MindFuel`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${displayTag} reflections on MindFuel`,
      description,
      images: [defaultOgImage],
    },
  };
}

export default async function HashtagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;

  return (
    <div className="flex flex-col w-full min-h-screen">
      <HashtagFeedClient tag={tag} />
    </div>
  );
}
