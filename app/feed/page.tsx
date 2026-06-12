import type { Metadata } from "next";
import FeedGuard from "@/components/FeedGuard";
import { absoluteUrl, defaultOgImage } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Public Reflection Feed",
  description:
    "Explore recent MindFuel reflections, daily prompts, personal growth lessons, and thoughtful posts from a mindful social journaling community.",
  alternates: {
    canonical: absoluteUrl("/feed"),
  },
  openGraph: {
    title: "MindFuel Public Reflection Feed",
    description:
      "Read recent reflections, lessons, and insights from the MindFuel social journal community.",
    url: absoluteUrl("/feed"),
    images: [
      {
        url: defaultOgImage,
        width: 1200,
        height: 630,
        alt: "MindFuel public reflection feed",
      },
    ],
  },
};

export default function FeedPage() {
  return (
    <div className="flex flex-col w-full min-h-screen">
      <FeedGuard />
    </div>
  );
}
