import type { Metadata } from "next";
import { absoluteUrl, defaultOgImage } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Search Reflections, People, and Hashtags",
  description:
    "Search MindFuel for thoughtful people, reflection topics, personal growth hashtags, and journal entries from the mindful social journaling community.",
  alternates: {
    canonical: absoluteUrl("/search"),
  },
  openGraph: {
    title: "Search MindFuel reflections",
    description:
      "Find reflection topics, thoughtful people, growth hashtags, and journal entries on MindFuel.",
    url: absoluteUrl("/search"),
    images: [
      {
        url: defaultOgImage,
        width: 1200,
        height: 630,
        alt: "Search MindFuel reflections and people",
      },
    ],
  },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
