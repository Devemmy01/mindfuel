/**
 * Who gets which notification, when. Every push and email trigger goes
 * through `canNotify` so preferences, quiet hours and caps are enforced on the
 * server, in one place. See docs/notifications.md.
 */
export const CATEGORIES = ["daily", "replies", "likes", "follows", "following", "messages", "reposts", "product"] as const;
export type NotificationCategory = (typeof CATEGORIES)[number];
export type Channel = "push" | "email";

export type CategoryToggles = Record<NotificationCategory, boolean>;

export type NotificationSettings = {
  push: CategoryToggles;
  email: CategoryToggles;
  /** Local hour (0-23) for the daily reminder. */
  reminderHour: number;
  /** IANA timezone, e.g. "Africa/Lagos". */
  timezone: string;
  skipWeekends: boolean;
  /** Local hours with no pushes. Null disables quiet hours. */
  quietStart: number | null;
  quietEnd: number | null;
};

/** Defaults favour a few useful notifications; likes stay quiet. */
export const DEFAULT_SETTINGS: NotificationSettings = {
  push: { daily: true, replies: true, likes: false, follows: true, following: false, messages: true, reposts: true, product: false },
  email: { daily: true, replies: true, likes: false, follows: false, following: true, messages: false, reposts: true, product: true },
  reminderHour: 20,
  timezone: "UTC",
  skipWeekends: false,
  quietStart: 22,
  quietEnd: 7,
};

/** Categories that only exist on one channel (the digest is an email). */
export const CATEGORY_CHANNELS: Partial<Record<NotificationCategory, Channel[]>> = {
  following: ["email"],
};

export function categoryHasChannel(category: NotificationCategory, channel: Channel) {
  return (CATEGORY_CHANNELS[category] || ["push", "email"]).includes(channel);
}

/** Local hour the "from people you follow" digest goes out. */
export const DIGEST_HOUR = 8;
/** Never reach further back than this, however long since the last digest. */
export const DIGEST_MAX_LOOKBACK_DAYS = 7;

/** Non-message pushes per user per local day. Messages are rate-limited separately. */
export const DAILY_PUSH_CAP = 6;
/** Inactivity win-back emails before we stop for good. */
export const MAX_WINBACKS = 3;

export const CATEGORY_LABELS: Record<NotificationCategory, { title: string; description: string }> = {
  daily: { title: "Daily reflection reminder", description: "Today's prompt at the time you choose." },
  replies: { title: "Replies and comments", description: "When someone replies to your reflections." },
  likes: { title: "Likes", description: "Grouped, so a popular reflection is one notification." },
  follows: { title: "New followers", description: "When someone follows you." },
  following: { title: "From people you follow", description: "A morning email when people you follow share reflections. At most once a day." },
  messages: { title: "Messages", description: "New messages. Never includes the message text." },
  reposts: { title: "Reposts and quotes", description: "When someone shares or quotes your reflection." },
  product: { title: "Product updates and tips", description: "Occasional news and a daily mindful tip." },
};

type StoredUser = {
  preferences?: { notifications?: boolean; dailyEmail?: boolean } | null;
  notificationSettings?: Partial<Omit<NotificationSettings, "push" | "email">> & {
    push?: Partial<CategoryToggles>;
    email?: Partial<CategoryToggles>;
  } | null;
};

export function isValidTimezone(timezone: unknown): timezone is string {
  if (typeof timezone !== "string" || !timezone || timezone.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

function hour(value: unknown, fallback: number | null) {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 23 ? (value as number) : fallback;
}

/** Saved settings over defaults, honouring the two legacy switches. */
export function resolveSettings(user: StoredUser | null | undefined): NotificationSettings {
  const saved = user?.notificationSettings || {};
  const legacyPushOff = user?.preferences?.notifications === false;
  const legacyEmailOff = user?.preferences?.dailyEmail === false;
  const push = { ...DEFAULT_SETTINGS.push } as CategoryToggles;
  const email = { ...DEFAULT_SETTINGS.email } as CategoryToggles;
  for (const category of CATEGORIES) {
    if (legacyPushOff) push[category] = false;
    if (legacyEmailOff) email[category] = false;
    if (typeof saved.push?.[category] === "boolean") push[category] = saved.push[category] as boolean;
    if (typeof saved.email?.[category] === "boolean") email[category] = saved.email[category] as boolean;
  }
  return {
    push,
    email,
    reminderHour: hour(saved.reminderHour, DEFAULT_SETTINGS.reminderHour) as number,
    timezone: isValidTimezone(saved.timezone) ? saved.timezone : DEFAULT_SETTINGS.timezone,
    skipWeekends: typeof saved.skipWeekends === "boolean" ? saved.skipWeekends : DEFAULT_SETTINGS.skipWeekends,
    quietStart: saved.quietStart === null ? null : hour(saved.quietStart, DEFAULT_SETTINGS.quietStart),
    quietEnd: saved.quietEnd === null ? null : hour(saved.quietEnd, DEFAULT_SETTINGS.quietEnd),
  };
}

/** The user's wall-clock date parts in their timezone (DST-safe via Intl). */
export function localParts(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
    weekday: get("weekday"),
  };
}

export function inQuietHours(settings: NotificationSettings, now: Date) {
  const { quietStart, quietEnd } = settings;
  if (quietStart === null || quietEnd === null || quietStart === quietEnd) return false;
  const { hour: current } = localParts(now, settings.timezone);
  return quietStart < quietEnd
    ? current >= quietStart && current < quietEnd
    : current >= quietStart || current < quietEnd;
}

type Counters = { pushDay?: string | null; pushSentToday?: number | null };

/**
 * Whether to send. `counters` are the user's push counters for the cap; pass
 * them for push. Messages ignore the cap and quiet hours only if the person
 * keeps message pushes on (they asked for them, and they are rate-limited).
 */
export function canNotify(
  user: StoredUser & Counters,
  category: NotificationCategory,
  channel: Channel,
  now = new Date(),
): { ok: true } | { ok: false; reason: "preference" | "quiet-hours" | "daily-cap" } {
  const settings = resolveSettings(user);
  if (!categoryHasChannel(category, channel) || !settings[channel][category]) return { ok: false, reason: "preference" };
  if (channel === "email") return { ok: true };
  if (category !== "messages" && inQuietHours(settings, now)) return { ok: false, reason: "quiet-hours" };
  if (category !== "messages") {
    const today = localParts(now, settings.timezone).date;
    const sent = user.pushDay === today ? user.pushSentToday || 0 : 0;
    if (sent >= DAILY_PUSH_CAP) return { ok: false, reason: "daily-cap" };
  }
  return { ok: true };
}

/** Whether the daily reminder is due for this user at `now` (hourly cron). */
export function reminderDue(
  user: StoredUser & { lastReflectionDate?: Date | string | null; lastReminderSentOn?: string | null },
  now = new Date(),
) {
  const settings = resolveSettings(user);
  if (!settings.push.daily) return false;
  const local = localParts(now, settings.timezone);
  if (local.hour !== settings.reminderHour) return false;
  if (settings.skipWeekends && (local.weekday === "Sat" || local.weekday === "Sun")) return false;
  if (user.lastReminderSentOn === local.date) return false;
  // Already reflected today (in their timezone): no reminder needed.
  if (user.lastReflectionDate && localParts(new Date(user.lastReflectionDate), settings.timezone).date === local.date) {
    return false;
  }
  return true;
}

/** Whether the "from people you follow" digest is due for this user at `now` (hourly cron). */
export function digestDue(user: StoredUser & { lastDigestSentOn?: string | null }, now = new Date()) {
  const settings = resolveSettings(user);
  if (!settings.email.following) return false;
  const local = localParts(now, settings.timezone);
  return local.hour === DIGEST_HOUR && user.lastDigestSentOn !== local.date;
}
