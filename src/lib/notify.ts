import "server-only";

import type { Types } from "mongoose";
import User from "@/models/user";
import Notification from "@/models/notification";
import Conversation from "@/models/conversation";
import Message from "@/models/message";
import NotificationStat from "@/models/notificationStat";
import { sendPushNotifications, type StoredPushSubscription } from "@/lib/sendPushNotifications";
import { canNotify, localParts, resolveSettings, type Channel, type NotificationCategory } from "@/lib/notification-policy";

export type PushPayload = {
  title: string;
  body: string;
  /** Absolute URL of the exact target (post, conversation, composer). */
  url: string;
  /** Repeats with the same tag replace each other instead of stacking. */
  tag?: string;
  icon?: string;
  /** Android only; ignored elsewhere. */
  actions?: Array<{ action: string; title: string }>;
};

const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL || "https://mind-fuel.app").replace(/\/$/, "");

export async function recordStat(category: string, channel: Channel, field: "sent" | "failed" | "skipped" | "clicked", count = 1) {
  if (count <= 0) return;
  const day = new Date().toISOString().slice(0, 10);
  await NotificationStat.updateOne(
    { day, category, channel },
    { $inc: { [field]: count } },
    { upsert: true },
  ).catch((error: unknown) => console.error("Notification stat failed", error));
}

/** Unread notifications plus unread messages, for the app icon badge. */
export async function unreadBadgeCount(userId: Types.ObjectId | string) {
  const [notifications, conversations] = await Promise.all([
    Notification.countDocuments({ recipient: userId, isRead: false }),
    Conversation.find({ participants: userId }).select("_id").lean(),
  ]);
  const messages = conversations.length
    ? await Message.countDocuments({
        conversation: { $in: conversations.map((conversation) => conversation._id) },
        sender: { $ne: userId },
        readBy: { $ne: userId },
      })
    : 0;
  return notifications + messages;
}

type PushUser = {
  _id: Types.ObjectId;
  preferences?: { notifications?: boolean; dailyEmail?: boolean };
  notificationSettings?: Record<string, unknown>;
  pushSubscriptions?: StoredPushSubscription[];
  pushDay?: string;
  pushSentToday?: number;
};

/**
 * Sends one category push to every device of a user, if their settings,
 * quiet hours and the daily cap allow it.
 */
export async function sendCategoryPush({
  userId,
  category,
  payload,
  now = new Date(),
}: {
  userId: Types.ObjectId | string;
  category: NotificationCategory;
  payload: PushPayload;
  now?: Date;
}) {
  const user = (await User.findById(userId)
    .select("preferences notificationSettings pushSubscriptions pushDay pushSentToday")
    .lean()) as PushUser | null;
  if (!user?.pushSubscriptions?.length) return { sent: 0, skipped: "no-device" as const };

  const decision = canNotify(user as Parameters<typeof canNotify>[0], category, "push", now);
  if (!decision.ok) {
    await recordStat(category, "push", "skipped");
    return { sent: 0, skipped: decision.reason };
  }

  const badgeCount = await unreadBadgeCount(user._id).catch(() => undefined);
  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || `${BASE_URL}/icon-192.png`,
    badge: `${BASE_URL}/icon-192.png`,
    tag: payload.tag,
    actions: payload.actions,
    url: payload.url,
    data: { url: payload.url, category, type: category === "messages" ? "message" : category, badgeCount },
  });

  const devices = new Set(user.pushSubscriptions.map((subscription) => subscription.endpoint)).size;
  const result = await sendPushNotifications({ recipientId: user._id, subscriptions: user.pushSubscriptions, payload: body });

  if (result.sent > 0 && category !== "messages") {
    const today = localParts(now, resolveSettings(user).timezone).date;
    await User.updateOne(
      { _id: user._id },
      user.pushDay === today ? { $inc: { pushSentToday: 1 } } : { $set: { pushDay: today, pushSentToday: 1 } },
    );
  }
  await recordStat(category, "push", "sent", result.sent);
  await recordStat(category, "push", "failed", Math.max(0, devices - result.sent - result.removed));
  return { sent: result.sent };
}

/** Email gate for a category (preferences only; email has no quiet hours). */
export function emailAllowed(user: Parameters<typeof canNotify>[0], category: NotificationCategory) {
  return canNotify(user, category, "email").ok;
}
