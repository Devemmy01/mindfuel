import Notification from "@/models/notification";
import User, { IUser } from "@/models/user";
import { sendPushNotifications, StoredPushSubscription } from "@/lib/sendPushNotifications";
import { Types } from "mongoose";

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || "https://mind-fuel.app";

interface NotificationParams {
  recipientId: string | Types.ObjectId;
  senderId: string | Types.ObjectId;
  type: "like" | "comment" | "reply" | "repost" | "quote" | "save";
  postId: string | Types.ObjectId;
  commentId?: string | Types.ObjectId;
  message: string;
  url: string;
}


export async function createNotification({
  recipientId,
  senderId,
  type,
  postId,
  commentId,
  message,
  url
}: NotificationParams) {
  try {
    // 1. Check if recipient exists and has notifications enabled
    const recipient = await User.findById(recipientId) as IUser | null;
    if (!recipient) return;

    // Don't notify yourself
    if (recipientId.toString() === senderId.toString()) return;

    // 2. Create In-App Notification Record
    await Notification.create({
      recipient: recipientId,
      sender: senderId,
      type,
      postId,
      commentId,
      isRead: false
    });

    // 3. Send Push Notification if enabled
    if (
      recipient.preferences?.notifications !== false &&
      recipient.pushSubscriptions &&
      recipient.pushSubscriptions.length > 0
    ) {
      const getTitle = () => {
        switch (type) {
          case "like": return "New Like";
          case "comment": return "New Comment";
          case "repost": return "New Repost";
          case "quote": return "New Quote";
          case "save": return "New Save";
          default: return "New Interaction";
        }
      };

      // Ensure the URL is absolute so the notification click opens the real
      // production domain and not localhost in any environment.
      const absoluteUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;

      const payload = JSON.stringify({
        title: getTitle(),
        body: message,
        icon: `${BASE_URL}/icon-192.png`,
        badge: `${BASE_URL}/icon-192.png`,
        url: absoluteUrl,
        tag: `${type}-${postId}-${senderId}`,
      });

      await sendPushNotifications({
        recipientId: recipient._id,
        subscriptions: recipient.pushSubscriptions as unknown as StoredPushSubscription[],
        payload,
      });
    }
  } catch (err) {
    console.error("Error creating notification:", err);
  }
}
