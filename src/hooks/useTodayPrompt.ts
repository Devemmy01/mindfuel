"use client";

import useSWR from "swr";
import type { DailyPrompt } from "@/lib/dailyPrompts";

/** The prompt rotation is keyed to the UTC day, on the server and here. */
export function utcDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

const fetchPrompt = async (url: string): Promise<DailyPrompt> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Prompt request failed: ${response.status}`);
  return response.json();
};

/**
 * Today's prompt without bundling the prompt list. Pass the server's prompt
 * as `initial` to render it immediately; the request is CDN-cached per day.
 */
export function useTodayPrompt(initial?: DailyPrompt | null) {
  const { data } = useSWR(`/api/prompts?date=${utcDateKey()}`, fetchPrompt, {
    fallbackData: initial ?? undefined,
    revalidateOnFocus: false,
    revalidateIfStale: false,
  });
  return data ?? null;
}

export async function fetchRandomPrompt(excludeId?: string) {
  const query = excludeId ? `&exclude=${encodeURIComponent(excludeId)}` : "";
  return fetchPrompt(`/api/prompts?random=1${query}`);
}
