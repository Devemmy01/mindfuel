// @ts-nocheck
declare let self: ServiceWorkerGlobalScope;

type PushPayload = {
  title?: string;
  body?: string;
  icon?: string;
  badge?: string;
  url?: string;
  data?: {
    url?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

function parsePushPayload(text: string): PushPayload {
  try {
    const payload = JSON.parse(text);
    return payload && typeof payload === "object"
      ? payload
      : { title: "MindFuel", body: String(payload) };
  } catch {
    return {
      title: "MindFuel",
      body: text,
    };
  }
}

/**
 * Handle Push Notifications
 */
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = parsePushPayload(event.data.text());
    const notificationData = data.data && typeof data.data === "object" ? data.data : {};
    const url = data.url || notificationData.url || "/";
    const options = {
      body: data.body,
      icon: data.icon || "/splash-logo.png",
      badge: data.badge || "/splash-logo.png",
      data: {
        ...notificationData,
        url,
      },
    };

    event.waitUntil(self.registration.showNotification(data.title || "MindFuel", options));
  } catch (err) {
    console.error("Error displaying push notification:", err);
  }
});

/**
 * Handle Notification Clicks
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  
  if (event.notification.data?.url) {
    event.waitUntil(
      self.clients.openWindow(event.notification.data.url)
    );
  }
});
