import type { Metadata } from "next";
import FeedGuard from "@/components/FeedGuard";
import { absoluteUrl, defaultOgImage } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Community Reflection Feed",
  description:
    "Explore reflections, shared lessons, and daily prompts from people growing together on MindFuel's personal growth network.",
  alternates: {
    canonical: absoluteUrl("/feed"),
  },
  robots: {
    index: false,
    follow: true,
  },
  openGraph: {
    title: "Grow Together on the MindFuel Reflection Feed",
    description:
      "Read thoughtful reflections and shared lessons from the MindFuel personal growth network.",
    url: absoluteUrl("/feed"),
    images: [
      {
        url: defaultOgImage,
        width: 1200,
        height: 630,
        alt: "MindFuel personal growth network reflection feed",
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
