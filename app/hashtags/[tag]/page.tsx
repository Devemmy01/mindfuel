import type { Metadata } from "next";
import HashtagFeedClient from "@/components/HashtagFeedClient";
import { absoluteUrl, defaultOgImage } from "@/lib/seo";
import { getPublicHashtagPage } from "@/lib/public-content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag).replace(/^#/, "");
  const displayTag = `#${decodedTag}`;
  const data = await getPublicHashtagPage(decodedTag);
  const title = `${displayTag} reflections and personal growth posts`;
  const description = `Read MindFuel reflections, lessons, and daily journal entries tagged ${displayTag}. Explore thoughtful posts about growth, learning, and mindful living.`;

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(`/hashtags/${encodeURIComponent(decodedTag)}`),
    },
    robots: {
      index: data.total >= 2,
      follow: true,
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
  const data = await getPublicHashtagPage(tag);
  const canonical = absoluteUrl(`/hashtags/${encodeURIComponent(data.hashtag.tag)}`);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${canonical}#collection`,
    name: `${data.hashtag.displayTag} reflections on MindFuel`,
    url: canonical,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: data.total,
      itemListElement: data.posts.map((post, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(`/post/${post._id}`),
      })),
    },
  };

  return (
    <div className="flex flex-col w-full min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <HashtagFeedClient tag={tag} initialData={data} />
    </div>
  );
}
