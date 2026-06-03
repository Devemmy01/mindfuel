import type { Metadata } from "next";
import LandingPage from "@/components/LandingPage";

export const metadata: Metadata = {
  title: "MindFuel | The Social Journal — Reflect. Learn. Grow.",
  description:
    "MindFuel is a social journal where people reflect, learn, and grow together through thoughtful conversations and daily reflection prompts. Share what life is teaching you.",
  keywords: [
    "social journal",
    "reflection app",
    "personal growth platform",
    "daily reflection prompts",
    "mindful social network",
    "journaling community",
  ],
};

export default function Home() {
  return <LandingPage />;
}
