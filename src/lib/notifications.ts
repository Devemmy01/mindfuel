import Notification from "@/models/notification";
import User, { IUser } from "@/models/user";
import webpush from "@/lib/push";
import { PushSubscription } from "web-push";
import { Types } from "mongoose";

interface NotificationParams {
  recipientId: string | Types.ObjectId;
  senderId: string | Types.ObjectId;
  type: "like" | "comment" | "reply";
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
      const payload = JSON.stringify({
        title: type === "like" ? "New Like" : "New Comment",
        body: message,
        icon: "/logo.png",
        url: url
      });

      // Send to all registered devices
      await Promise.all(
        recipient.pushSubscriptions.map((sub) =>
          webpush.sendNotification(sub as unknown as PushSubscription, payload).catch((err) => {
            console.error("Failed to send push notification to a subscription:", err);
            // If subscription is expired/invalid, we could potentially remove it here
          })
        )
      );
    }
  } catch (err) {
    console.error("Error creating notification:", err);
  }
}
