// @ts-nocheck
declare let self: ServiceWorkerGlobalScope;


/**
 * Handle Push Notifications
 */
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = JSON.parse(event.data.text());
    const options = {
      body: data.body,
      icon: data.icon || "/logo.png",
      badge: "/logo.png",
      data: {
        url: data.url || "/",
      },
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
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
