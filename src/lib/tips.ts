import "server-only";

import Tip from "@/models/tip";
import { DAILY_TIPS } from "@/lib/dailyTips";
import { REVIEW_ONLY_SOURCES, screenTip } from "@/lib/tip-screen";

/**
 * Tips that may be shown: explicitly approved, or legacy tips (synced before
 * review existed) from quote sources. Joke-advice sources only appear once a
 * person approves them.
 */
export const SHOWABLE_TIPS = {
  $or: [
    { status: "approved" },
    { status: { $exists: false }, source: { $nin: [...REVIEW_ONLY_SOURCES] } },
  ],
};

type TipDoc = { text: string; author?: string; source?: string; category?: string };

/** A random showable tip, screened again at read time; curated fallback otherwise. */
export async function randomShowableTip(): Promise<TipDoc> {
  try {
    const candidates = (await Tip.aggregate([{ $match: SHOWABLE_TIPS }, { $sample: { size: 8 } }])) as TipDoc[];
    const tip = candidates.find((candidate) => screenTip(candidate.text).ok);
    if (tip) return tip;
  } catch (error) {
    console.error("Random tip lookup failed", error);
  }
  const text = DAILY_TIPS[Math.floor(Math.random() * DAILY_TIPS.length)];
  return { text, author: "MindFuel", source: "Manual", category: "mindfulness" };
}

/** Every showable tip text (for the daily email pool). */
export async function showableTipTexts(limit = 1000): Promise<string[]> {
  const stored = (await Tip.find(SHOWABLE_TIPS).select("text -_id").limit(limit).lean()) as unknown as TipDoc[];
  return stored.map((tip) => tip.text).filter((text) => screenTip(text).ok);
}
