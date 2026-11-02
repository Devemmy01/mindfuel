import type { DailyPrompt } from "@/lib/dailyPrompts";

const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL || "https://mind-fuel.app").replace(/\/$/, "");

/**
 * The composer, opened on a prompt. Every "write today's reflection" entry
 * point (rail, emails, pushes, shortcuts) uses this so they land the same way.
 */
export function composeHref(prompt: Pick<DailyPrompt, "id" | "question">, source?: string) {
  const params = new URLSearchParams({ prompt: prompt.question, promptId: prompt.id });
  if (source) params.set("source", source);
  return `/create?${params.toString()}`;
}

/** Absolute composer URL for emails and push payloads. */
export function absoluteComposeUrl(prompt: Pick<DailyPrompt, "id" | "question">, source: string) {
  return `${BASE_URL}${composeHref(prompt, source)}`;
}

export function absoluteUrl(path: string) {
  return `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
