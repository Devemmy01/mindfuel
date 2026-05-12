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

self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = JSON.parse(event.data.text());
    const options = {
      body: data.body,
      icon: data.icon || "/icon-192.png",
      badge: "/icon-192.png",
      data: {
        url: data.url || "/",
      },
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
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
