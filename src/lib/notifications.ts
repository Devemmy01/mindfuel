import Notification from "@/models/notification";
import { isBlockedBetween } from "@/lib/blocks";
import User from "@/models/user";
import { sendCategoryPush } from "@/lib/notify";
import type { NotificationCategory } from "@/lib/notification-policy";
import { Types } from "mongoose";

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || "https://mind-fuel.app";

type InteractionType = "like" | "comment" | "reply" | "repost" | "quote" | "save";

interface NotificationParams {
  recipientId: string | Types.ObjectId;
  senderId: string | Types.ObjectId;
  type: InteractionType;
  postId: string | Types.ObjectId;
  commentId?: string | Types.ObjectId;
  /** Kept for callers; push text is now built here so it can be grouped. */
  message?: string;
  url: string;
}

const CATEGORY: Record<InteractionType, NotificationCategory> = {
  like: "likes",
  save: "likes",
  comment: "replies",
  reply: "replies",
  repost: "reposts",
  quote: "reposts",
};

const VERB: Record<InteractionType, string> = {
  like: "liked your reflection",
  save: "saved your reflection",
  comment: "replied to your reflection",
  reply: "replied to your comment",
  repost: "reposted your reflection",
  quote: "quoted your reflection",
};

/** "Ada", "Ada and Ben", "Ada and 4 others". */
export function groupedActor(firstName: string, othersCount: number) {
  if (othersCount <= 0) return firstName;
  if (othersCount === 1) return `${firstName} and 1 other`;
  return `${firstName} and ${othersCount} others`;
}

export async function createNotification({
  recipientId,
  senderId,
  type,
  postId,
  commentId,
  url,
}: NotificationParams) {
  try {
    if (recipientId.toString() === senderId.toString()) return;
    if (await isBlockedBetween(recipientId, senderId)) return;

    // One row per person, action and post: like/unlike/like refreshes the
    // existing notification instead of stacking duplicates. Comments and
    // replies are distinct events and always get their own row.
    if (type === "comment" || type === "reply") {
      await Notification.create({ recipient: recipientId, sender: senderId, type, postId, commentId, isRead: false });
    } else {
      const now = new Date();
      await Notification.updateOne(
        { recipient: recipientId, sender: senderId, type, postId },
        // Bump createdAt so the refreshed notification moves to the top. Set
        // explicitly (timestamps off) to avoid $set/$setOnInsert conflicts.
        { $set: { isRead: false, createdAt: now, updatedAt: now } },
        { upsert: true, timestamps: false },
      );
    }

    const [sender, othersUnread] = await Promise.all([
      User.findById(senderId).select("name").lean() as Promise<{ name?: string } | null>,
      Notification.countDocuments({ recipient: recipientId, type, postId, isRead: false, sender: { $ne: senderId } }),
    ]);
    const firstName = (sender?.name || "Someone").trim().split(/\s+/)[0] || "Someone";

    await sendCategoryPush({
      userId: recipientId,
      category: CATEGORY[type],
      payload: {
        title: "MindFuel",
        body: `${groupedActor(firstName, othersUnread)} ${VERB[type]}`,
        url: url.startsWith("http") ? url : `${BASE_URL}${url}`,
        // Repeats for the same post replace each other on the device.
        tag: `${type}-${postId}`,
      },
    });
  } catch (err) {
    console.error("Error creating notification:", err);
  }
}
