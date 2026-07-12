export const siteUrl = (
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://mind-fuel.app"
).replace(/\/$/, "");

export const siteName = "MindFuel";
export const defaultOgImage = `${siteUrl}/og-image-v2.png`;

export const siteDescription =
  "Build self-awareness with daily reflection prompts, practical journaling guides, and a thoughtful personal growth community. Join MindFuel for free.";

export const homeTitle =
  "Daily Reflection App & Personal Growth Community | MindFuel";

export const homeOgDescription =
  "Turn everyday experiences into clearer choices with guided reflection, personal journaling, and a community built for meaningful growth.";

export const seoKeywords = [
  "MindFuel",
  "personal growth network",
  "personal growth community",
  "reflection community",
  "grow together through reflection",
  "social reflection platform",
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
      "MindFuel is a personal growth network where people grow together through reflection. Members share lessons, answer thoughtful prompts, save meaningful ideas, and support one another's growth.",
  },
  {
    question: "Who is MindFuel for?",
    answer:
      "MindFuel is for anyone who wants to grow intentionally alongside others, including students, creators, founders, professionals, and lifelong learners.",
  },
  {
    question: "How is MindFuel different from regular social media?",
    answer:
      "MindFuel is built around shared growth instead of attention and performance. Reflection, thoughtful prompts, saved lessons, and meaningful replies help people learn from one another.",
  },
  {
    question: "Can I use MindFuel as a personal growth journal?",
    answer:
      "Yes. Your reflections form a searchable personal archive, while the wider network gives you perspective, encouragement, and lessons from people growing alongside you.",
  },
];

export function absoluteUrl(path = "/") {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
