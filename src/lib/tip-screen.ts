/**
 * Tips appear to every visitor on a reflection app, so anything that could
 * read as cruel, sarcastic, or distressing is screened out. This is a
 * conservative filter: when in doubt, a tip is held for manual review.
 */
const BLOCKED: Array<[RegExp, string]> = [
  [/\b(suicid\w*|kill(s|ed|ing)? (your|my|him|her|them)sel(f|ves)|self[- ]?harm|end (it|your life)|want(ing)? to die)\b/i, "self-harm"],
  [/\b(dead|death|die[sd]?|dying|funeral|grave|corpse)\b/i, "death"],
  [/\b(nobody|no one|no-one) (cares|loves|likes|wants)\b/i, "rejection"],
  [/\b(payments?|debts?|loans?|credit (card|score)|mortgage|bills?|bankrupt\w*|taxes)\b/i, "money-joke"],
  [/\b(kill\w*|murder\w*|gun|shoot\w*|stab\w*|punch\w*|weapon|revenge|hate)\b/i, "violence"],
  [/\b(sex\w*|naked|nude|porn\w*|hooker)\b/i, "sexual"],
  [/\b(drunk|beer|vodka|wine|whiskey|weed|cocaine|drugs?|hangover)\b/i, "substances"],
  [/\b(fat|ugly|stupid|idiot|moron|loser|dumb)\b/i, "insult"],
  [/\b(diet|calories|lose weight|skinny)\b/i, "body-image"],
  [/\b(god|jesus|allah|pray\w*|bible|church)\b/i, "religion"],
  [/\b(politic\w*|democrat|republican|election)\b/i, "politics"],
  [/https?:\/\/|www\./i, "link"],
];

export type ScreenResult = { ok: true } | { ok: false; reason: string };

export function screenTip(text: unknown): ScreenResult {
  if (typeof text !== "string") return { ok: false, reason: "empty" };
  const trimmed = text.trim();
  if (trimmed.length < 12) return { ok: false, reason: "too-short" };
  if (trimmed.length > 220) return { ok: false, reason: "too-long" };
  for (const [pattern, reason] of BLOCKED) {
    if (pattern.test(trimmed)) return { ok: false, reason };
  }
  return { ok: true };
}

/** Sources whose tips are jokes or random advice: always held for a person to review. */
export const REVIEW_ONLY_SOURCES = new Set(["AdviceSlip"]);

/** Initial status for a newly synced tip. */
export function initialTipStatus(text: string, source: string): "approved" | "pending" | "rejected" {
  const screened = screenTip(text);
  if (!screened.ok) return "rejected";
  return REVIEW_ONLY_SOURCES.has(source) ? "pending" : "approved";
}
