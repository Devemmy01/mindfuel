import User from "@/models/user";
import webpush from "@/lib/push";
import type { PushSubscription } from "web-push";

export type StoredPushSubscription = PushSubscription & {
  deviceId?: string;
};

type PushError = { statusCode?: number };

/**
 * Send one push per endpoint, even if legacy data contains duplicate Mongoose
 * subdocuments. Invalid endpoints are removed and exact duplicates are
 * normalized in storage after delivery.
 */
export async function sendPushNotifications({
  recipientId,
  subscriptions,
  payload,
}: {
  recipientId: unknown;
  subscriptions: StoredPushSubscription[];
  payload: string;
}) {
  const uniqueByEndpoint = new Map<string, StoredPushSubscription>();
  for (const subscription of subscriptions || []) {
    if (subscription?.endpoint) uniqueByEndpoint.set(subscription.endpoint, subscription);
  }

  const uniqueSubscriptions = [...uniqueByEndpoint.values()];
  const invalidEndpoints = new Set<string>();
  let sent = 0;

  await Promise.allSettled(
    uniqueSubscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(subscription, payload);
        sent += 1;
      } catch (error: unknown) {
        const statusCode =
          error && typeof error === "object"
            ? Number((error as PushError).statusCode || 0)
            : 0;
        if (statusCode === 404 || statusCode === 410) {
          invalidEndpoints.add(subscription.endpoint);
          return;
        }
        console.error("Push delivery failed:", error);
      }
    }),
  );

  const hadDuplicates = uniqueSubscriptions.length !== subscriptions.length;
  if (hadDuplicates || invalidEndpoints.size > 0) {
    const cleaned = uniqueSubscriptions
      .filter((subscription) => !invalidEndpoints.has(subscription.endpoint))
      .map((subscription) => ({
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        ...(subscription.deviceId ? { deviceId: subscription.deviceId } : {}),
      }));
    await User.updateOne(
      { _id: recipientId },
      { $set: { pushSubscriptions: cleaned } },
    ).catch((error) => console.error("Push subscription cleanup failed:", error));
  }

  return { sent, removed: invalidEndpoints.size, duplicates: subscriptions.length - uniqueSubscriptions.length };
}
