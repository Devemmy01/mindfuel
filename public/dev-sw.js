/**
 * MindFuel Development Service Worker
 * This worker is specialized for Push Notifications in Dev Mode.
 * It skips precaching to avoid 404 errors on localhost.
 */

self.addEventListener("install", (event) => {
  console.log("Dev-SW: Installing...");
  self.skipWaiting(); // Force activation
});

self.addEventListener("activate", (event) => {
  console.log("Dev-SW: Activating...");
  event.waitUntil(clients.claim()); // Take control of the page immediately
});

function parsePushPayload(text) {
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

self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = parsePushPayload(event.data.text());
    const notificationData = data.data && typeof data.data === "object" ? data.data : {};
    const url = data.url || notificationData.url || "/";
    const options = {
      body: data.body,
      icon: data.icon || "/icon-192.png",
      badge: data.badge || "/icon-192.png",
      data: {
        ...notificationData,
        url,
      },
    };

    event.waitUntil(self.registration.showNotification(data.title || "MindFuel", options));
  } catch (err) {
    console.error("Dev-SW: Push error:", err);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  
  if (event.notification.data?.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});
