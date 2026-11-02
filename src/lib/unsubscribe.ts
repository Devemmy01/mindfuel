import { createHmac, timingSafeEqual } from "node:crypto";
import { CATEGORIES, type NotificationCategory } from "@/lib/notification-policy";
import { absoluteUrl } from "@/lib/links";

/**
 * Signed one-tap unsubscribe tokens: `<userId>.<category>.<signature>`.
 * Without a configured secret, emails link to the settings page instead.
 */
function secret() {
  return process.env.UNSUBSCRIBE_SECRET || process.env.CRON_SECRET || "";
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function unsubscribeToken(userId: string, category: NotificationCategory) {
  if (!secret()) return null;
  const payload = `${userId}.${category}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyUnsubscribeToken(token: unknown): { userId: string; category: NotificationCategory } | null {
  if (typeof token !== "string" || !secret()) return null;
  const [userId, category, signature] = token.split(".");
  if (!userId || !category || !signature || !(CATEGORIES as readonly string[]).includes(category)) return null;
  const expected = Buffer.from(sign(`${userId}.${category}`));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return { userId, category: category as NotificationCategory };
}

/** The visible footer link and the RFC 8058 one-click headers for an email. */
export function unsubscribeFor(userId: string, category: NotificationCategory) {
  const token = unsubscribeToken(userId, category);
  if (!token) {
    return { url: absoluteUrl("/settings/notifications"), headers: {} as Record<string, string> };
  }
  const url = absoluteUrl(`/unsubscribe?token=${encodeURIComponent(token)}`);
  const oneClick = absoluteUrl(`/api/unsubscribe?token=${encodeURIComponent(token)}`);
  return {
    url,
    headers: {
      "List-Unsubscribe": `<${oneClick}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}
