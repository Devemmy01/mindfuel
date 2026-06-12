export const siteUrl = (
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://mind-fuel.app"
).replace(/\/$/, "");

export const siteName = "MindFuel";
export const defaultOgImage = `${siteUrl}/og-image.png`;

export const siteDescription =
  "MindFuel is a social journal and reflection app for thoughtful people who want daily prompts, personal growth tracking, and meaningful conversations without vanity metrics.";

export const seoKeywords = [
  "MindFuel",
  "social journal",
  "reflection app",
  "daily reflection prompts",
  "mindful social network",
  "personal growth app",
  "journaling community",
  "self improvement journal",
  "growth mindset app",
  "thoughtful social media",
  "online reflection journal",
  "mental clarity journal",
  "lifelong learning community",
  "mindfulness journaling",
];

export const landingFaqs = [
  {
    question: "What is MindFuel?",
    answer:
      "MindFuel is a social journal where people write reflections, answer daily prompts, save meaningful thoughts, and grow through thoughtful conversations.",
  },
  {
    question: "Who is MindFuel for?",
    answer:
      "MindFuel is for students, creators, founders, professionals, and lifelong learners who want a calmer place to document lessons, insights, and personal growth.",
  },
  {
    question: "How is MindFuel different from regular social media?",
    answer:
      "MindFuel is built around reflection instead of vanity metrics. It encourages depth, journaling, prompts, saves, and meaningful replies rather than attention-chasing posts.",
  },
  {
    question: "Can I use MindFuel as a personal growth journal?",
    answer:
      "Yes. MindFuel helps you build a searchable archive of reflections, track streaks, revisit saved ideas, and turn everyday lessons into a visible growth history.",
  },
];

export function absoluteUrl(path = "/") {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
