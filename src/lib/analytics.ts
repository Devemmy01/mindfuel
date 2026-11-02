import { track as vercelTrack } from "@vercel/analytics";

/**
 * Product events. Privacy-light by design: no reflection text, names, emails
 * or ids. Each event carries a client timestamp so time-to-first-reflection
 * and day-2 return can be computed from event pairs.
 */
export type AnalyticsEvent =
  | "landing_view"
  | "composer_focus"
  | "composer_first_keystroke"
  | "post_attempt_guest"
  | "signin_shown"
  | "signin_success"
  | "signin_failed"
  | "post_success"
  | "post_success_first"
  | "post_failed"
  | "coachmark_completed"
  | "coachmark_skipped"
  | "day2_return"
  | "push_prompt_shown"
  | "push_prompt_accepted"
  | "push_prompt_declined";

type Props = Record<string, string | number | boolean | null>;

const SESSION_START_KEY = "mindfuel:analytics:session-start";
const FIRST_REFLECTION_KEY = "mindfuel:analytics:first-reflection-at";
const DAY2_SENT_KEY = "mindfuel:analytics:day2-sent";

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** When this visitor's first session in the funnel began (for elapsed times). */
function sessionStart() {
  try {
    const existing = Number(sessionStorage.getItem(SESSION_START_KEY));
    if (existing) return existing;
    const now = Date.now();
    sessionStorage.setItem(SESSION_START_KEY, String(now));
    return now;
  } catch {
    return Date.now();
  }
}

export function track(event: AnalyticsEvent, props: Props = {}) {
  if (typeof window === "undefined") return;
  const now = Date.now();
  try {
    vercelTrack(event, { ...props, t: now, sinceSessionStartMs: now - sessionStart() });
  } catch {
    // Analytics must never break the product.
  }
}

/** Fire an event once per page session (e.g. composer_first_keystroke). */
const firedThisPage = new Set<string>();
export function trackOnce(event: AnalyticsEvent, props: Props = {}) {
  if (firedThisPage.has(event)) return;
  firedThisPage.add(event);
  track(event, props);
}

export function recordFirstReflection() {
  storage()?.setItem(FIRST_REFLECTION_KEY, String(Date.now()));
}

/**
 * Sends day2_return once when someone who wrote their first reflection on
 * this device comes back on the next calendar day.
 */
export function checkDayTwoReturn() {
  const store = storage();
  if (!store || store.getItem(DAY2_SENT_KEY)) return;
  const first = Number(store.getItem(FIRST_REFLECTION_KEY));
  if (!first) return;
  const firstDay = new Date(first);
  firstDay.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - firstDay.getTime()) / 86_400_000);
  if (days === 1) {
    store.setItem(DAY2_SENT_KEY, "1");
    track("day2_return");
  } else if (days > 1) {
    store.setItem(DAY2_SENT_KEY, "missed");
  }
}
