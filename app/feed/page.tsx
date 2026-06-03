import type { Metadata } from "next";
import FeedGuard from "@/components/FeedGuard";

export const metadata: Metadata = {
  title: "Feed",
  description:
    "Your MindFuel feed — read reflections, lessons, and insights from the people you follow and the wider community.",
};

export default function FeedPage() {
  return (
    <div className="flex flex-col w-full min-h-screen">
      <FeedGuard />
    </div>
  );
}
