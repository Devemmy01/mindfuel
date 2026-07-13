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
      tag: typeof data.tag === "string" ? data.tag : undefined,
      data: {
        ...notificationData,
        url,
      },
    };

    event.waitUntil((async () => {
      if (notificationData.type === "message") {
        const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        if (clients.some((client) => client.visibilityState === "visible")) return;
      }
      await self.registration.showNotification(data.title || "MindFuel", options);
    })());
  } catch (err) {
    console.error("Error displaying push notification:", err);
  }
});

/**
 * Handle Notification Clicks
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil((async () => {
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
      if ("navigate" in client) await client.navigate(targetUrl.href);
      await client.focus();
      return;
    }

    await self.clients.openWindow(targetUrl.href);
  })());
});
