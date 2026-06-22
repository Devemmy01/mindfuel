import type { Metadata } from "next";
import { absoluteUrl, defaultOgImage } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Search Reflections, People, and Hashtags",
  description:
    "Search MindFuel's personal growth network for thoughtful people, reflection topics, growth hashtags, and shared lessons.",
  alternates: {
    canonical: absoluteUrl("/search"),
  },
  openGraph: {
    title: "Search the MindFuel Personal Growth Network",
    description:
      "Find thoughtful people, reflection topics, growth hashtags, and shared lessons on MindFuel.",
    url: absoluteUrl("/search"),
    images: [
      {
        url: defaultOgImage,
        width: 1200,
        height: 630,
        alt: "Search people and reflections on MindFuel's personal growth network",
      },
    ],
  },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
