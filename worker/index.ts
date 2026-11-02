// @ts-nocheck
declare let self: ServiceWorkerGlobalScope;

type PushPayload = {
  title?: string;
  body?: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  actions?: Array<{ action: string; title: string }>;
  data?: {
    url?: string;
    category?: string;
    type?: string;
    badgeCount?: number;
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

async function setBadge(count: unknown) {
  if (typeof count !== "number" || !("setAppBadge" in self.navigator)) return;
  try {
    if (count > 0) await self.navigator.setAppBadge(count);
    else await self.navigator.clearAppBadge();
  } catch {
    // Badging is best-effort (installed apps only).
  }
}

/**
 * Handle Push Notifications.
 *
 * Every push shows a notification. Browsers require it (`userVisibleOnly`),
 * and Safari revokes subscriptions that receive silent pushes. When the app is
 * already visible we show it silently instead of skipping it.
 */
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = parsePushPayload(event.data.text());
  const notificationData = data.data && typeof data.data === "object" ? data.data : {};
  const url = data.url || notificationData.url || "/";

  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const appVisible = clients.some((client) => client.visibilityState === "visible");
    await setBadge(notificationData.badgeCount);
    await self.registration.showNotification(data.title || "MindFuel", {
      body: data.body,
      icon: data.icon || "/icon-192.png",
      badge: data.badge || "/icon-192.png",
      tag: typeof data.tag === "string" ? data.tag : undefined,
      // Repeats with the same tag replace the old one; only buzz if the app is not open.
      renotify: false,
      silent: appVisible,
      actions: Array.isArray(data.actions) ? data.actions.slice(0, 2) : undefined,
      data: { ...notificationData, url },
    });
    // Let an open app refresh its counts without waiting for a poll.
    clients.forEach((client) => client.postMessage({ type: "mindfuel:push", category: notificationData.category }));
  })());
});

/**
 * Handle Notification Clicks: focus an open window and take it to the exact
 * target, or open a new one. Works for installed apps on Android and iOS.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil((async () => {
    const category = event.notification.data?.category;
    if (category) {
      fetch("/api/push/clicked", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
        keepalive: true,
      }).catch(() => undefined);
    }

    const rawUrl = event.notification.data?.url || "/";
    const requestedUrl = new URL(rawUrl, self.location.origin);
    const serviceWorkerHost = self.location.hostname.replace(/^www\./, "");

    // Older notifications used the apex domain while production and the PWA
    // run on www. Keep those links inside this service worker's app scope.
    const targetUrl = requestedUrl.hostname.replace(/^www\./, "") === serviceWorkerHost
      ? new URL(`${requestedUrl.pathname}${requestedUrl.search}${requestedUrl.hash}`, self.location.origin)
      : requestedUrl;
    const windowClients = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });
    const sameOriginClients = windowClients.filter((client) => {
      try {
        return new URL(client.url).origin === targetUrl.origin;
      } catch {
        return false;
      }
    });
    const client = sameOriginClients.find((candidate) => {
      try {
        return new URL(candidate.url).pathname === targetUrl.pathname;
      } catch {
        return false;
      }
    }) || sameOriginClients[0];

    if (client) {
      await client.focus();
      try {
        if ("navigate" in client) {
          await client.navigate(targetUrl.href);
          return;
        }
      } catch {
        // Uncontrolled windows cannot be navigated by the worker; ask the app.
      }
      client.postMessage({ type: "mindfuel:navigate", url: targetUrl.href });
      return;
    }

    await self.clients.openWindow(targetUrl.href);
  })());
});

/**
 * The push service rotated this device's subscription. Subscribe again with
 * the same key and tell the server which endpoint it replaces.
 */
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil((async () => {
    const oldEndpoint = event.oldSubscription?.endpoint;
    let subscription = event.newSubscription;
    if (!subscription) {
      const applicationServerKey = event.oldSubscription?.options?.applicationServerKey;
      if (!applicationServerKey) return;
      subscription = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
    }
    if (!oldEndpoint || !subscription) return;
    await fetch("/api/push/resubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldEndpoint, subscription: subscription.toJSON() }),
    });
  })());
});

/** "New version available → Refresh" asks the waiting worker to take over. */
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
