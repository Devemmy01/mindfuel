import { useState, useCallback } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PUSH_DEVICE_KEY = "mindfuel_push_device_id";

export function usePushNotifications() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isSubscribing, setIsSubscribing] = useState(false);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  /** Resolves true when this device is subscribed. */
  const subscribeUser = useCallback(async (): Promise<boolean> => {
    if (!user) {
      console.log("Push: No user found in auth context");
      return false;
    }
    
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      showToast("Push notifications are not supported on this browser", "warning");
      return false;
    }

    // Never install the production caching worker on localhost. It can keep
    // serving old app chunks after Fast Refresh and make newly wired controls
    // appear unresponsive during development.
    if (process.env.NODE_ENV === "development") {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
      if ("caches" in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      }
      showToast("Push notifications are available in production builds", "warning");
      return false;
    }

    if (!VAPID_PUBLIC_KEY) {
      console.error("Push: NEXT_PUBLIC_VAPID_PUBLIC_KEY is missing from environment");
      showToast("System configuration error (VAPID)", "error");
      return false;
    }

    setIsSubscribing(true);
    console.log("Push: Starting subscription process...");

    try {
      // 1. Request Permission with timeout
      console.log("Push: Requesting permission...");
      
      const requestPermission = (): Promise<NotificationPermission> => {
        try {
          const result = Notification.requestPermission();
          if (result && typeof result.then === "function") {
            return result as Promise<NotificationPermission>;
          }
        } catch {
          // Fallback to callback if promise throws or is not supported
        }
        return new Promise<NotificationPermission>((resolve) => {
          Notification.requestPermission((permission) => {
            resolve(permission);
          });
        });
      };

      // No timeout: people may take a while to read the browser prompt, and
      // rejecting early left them without a subscription after they allowed.
      const permission = await requestPermission();

      if (permission !== "granted") {
        console.warn("Push: Permission denied by user");
        showToast("Notifications are blocked for MindFuel. You can allow them in your browser's site settings.", "warning");
        return false;
      }

      // 2. Acquire the root Service Worker registration used by next-pwa.
      // We wait for the current registration to become active instead of
      // relying on `ready`, which can hang when the worker is mid-update.
      console.log("Push: Acquiring active Service Worker...");
      let registration: ServiceWorkerRegistration | undefined;

      try {
        const waitForActiveWorker = async (reg: ServiceWorkerRegistration, timeoutMs: number) => {
          if (reg.active) return reg;

          const worker = reg.installing || reg.waiting;
          if (!worker) return reg;

          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              worker.removeEventListener("statechange", onStateChange);
              reject(new Error("Service Worker failed to activate in time."));
            }, timeoutMs);

            const onStateChange = () => {
              if (worker.state === "activated") {
                clearTimeout(timeout);
                worker.removeEventListener("statechange", onStateChange);
                resolve();
              } else if (worker.state === "redundant") {
                clearTimeout(timeout);
                worker.removeEventListener("statechange", onStateChange);
                reject(new Error("Service Worker was replaced before activation."));
              }
            };

            worker.addEventListener("statechange", onStateChange);
          });

          return reg;
        };

        registration = await navigator.serviceWorker.getRegistration("/");

        if (!registration) {
          console.log("Push: No root SW found. Registering /sw.js");
          registration = await navigator.serviceWorker.register("/sw.js", {
            scope: "/",
            updateViaCache: "none",
          });
        }

        try {
          registration = await waitForActiveWorker(registration, 15000);
        } catch (firstError) {
          console.warn("Push: First activation attempt failed, retrying with a clean registration...", firstError);
          const existing = await navigator.serviceWorker.getRegistration("/");
          if (existing) {
            await existing.unregister();
          }

          registration = await navigator.serviceWorker.register("/sw.js", {
            scope: "/",
            updateViaCache: "none",
          });
          registration = await waitForActiveWorker(registration, 20000);
        }

        const refreshedRegistration = await navigator.serviceWorker.getRegistration("/");
        if (refreshedRegistration?.active) {
          registration = refreshedRegistration;
        }

        console.log("Push: Service Worker registration ready at", registration.scope);
      } catch (regError: unknown) {
        console.warn("Push: Worker acquisition failed", regError);
        const message = regError instanceof Error ? regError.message : "Unknown activation error";
        throw new Error(`Worker Error: ${message}`);
      }

      if (!registration?.active) {
        throw new Error("Service Worker is not active yet. Refresh the page and try again.");
      }

      // 3. Subscribe to Push, reusing an existing subscription when present.
      console.log("Push: Subscribing to PushManager...");
      const subscription =
        (await registration.pushManager.getSubscription()) ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }));

      console.log("Push: Subscription successful, syncing with backend...");

      let deviceId = localStorage.getItem(PUSH_DEVICE_KEY);
      if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem(PUSH_DEVICE_KEY, deviceId);
      }

      // 4. Send to Backend
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription,
          deviceId,
        }),
      });

      if (res.ok) {
        console.log("Push: Successfully synced with backend!");
        showToast("Reminders are on for this device.", "success");
        return true;
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to sync subscription");
      }
    } catch (error: unknown) {
      console.error("Push subscription error:", error);
      const message = error instanceof Error ? error.message : "Failed to enable notifications";
      showToast(message, "error");
      return false;
    } finally {
      setIsSubscribing(false);
    }
  }, [user, showToast]);

  return { subscribeUser, isSubscribing };
}
