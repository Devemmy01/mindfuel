import { useState, useCallback } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

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

  const subscribeUser = useCallback(async () => {
    if (!user) {
      console.log("Push: No user found in auth context");
      return;
    }
    
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      showToast("Push notifications are not supported on this browser", "warning");
      return;
    }

    if (!VAPID_PUBLIC_KEY) {
      console.error("Push: NEXT_PUBLIC_VAPID_PUBLIC_KEY is missing from environment");
      showToast("System configuration error (VAPID)", "error");
      return;
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
        } catch (_) {
          // Fallback to callback if promise throws or is not supported
        }
        return new Promise<NotificationPermission>((resolve) => {
          Notification.requestPermission((permission) => {
            resolve(permission);
          });
        });
      };

      const permission = await Promise.race([
        requestPermission(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Permission request timed out")), 5000))
      ]) as NotificationPermission;

      if (permission !== "granted") {
        console.warn("Push: Permission denied by user");
        showToast("Notification permission denied", "warning");
        return;
      }

      // 2. Register the Service Worker then wait for it to become active
      console.log("Push: Ensuring Service Worker is registered...");
      let registration: ServiceWorkerRegistration | undefined;

      try {
        const isDev =
          process.env.NODE_ENV === "development" ||
          window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1" ||
          window.location.hostname.startsWith("192.168.") ||
          window.location.hostname.startsWith("10.") ||
          window.location.hostname.endsWith(".local");

        const swUrl = isDev ? "/dev-sw.js" : "/sw.js";
        console.log(`Push: Registering worker at ${swUrl}...`);

        // Register once — do NOT re-call register() inside a loop; it races
        // against the browser's own activation lifecycle on mobile browsers.
        await navigator.serviceWorker.register(swUrl);
        console.log("Push: Service Worker registered, waiting for activation...");

        // navigator.serviceWorker.ready is the correct API:
        // it returns a Promise that resolves only when there is an ACTIVE
        // service worker controlling the page — no polling required.
        const ACTIVATION_TIMEOUT_MS = 15_000;
        registration = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error("Service Worker failed to reach active state in time.")),
              ACTIVATION_TIMEOUT_MS
            )
          ),
        ]);

        console.log("Push: Service Worker is now ACTIVE!", registration.scope);
      } catch (regError: unknown) {
        console.warn("Push: Worker activation failed", regError);
        const message = regError instanceof Error ? regError.message : "Unknown activation error";
        throw new Error(`Worker Error: ${message}`);
      }

      if (!registration || !registration.active) throw new Error("No active Service Worker found");

      // 3. Subscribe to Push
      console.log("Push: Subscribing to PushManager...");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      console.log("Push: Subscription successful, syncing with backend...");

      // 4. Send to Backend
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription,
          userId: user.uid,
        }),
      });

      if (res.ok) {
        console.log("Push: Successfully synced with backend!");
        showToast("You're all set! Daily Fuel alerts are active.", "success");
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to sync subscription");
      }
    } catch (error: unknown) {
      console.error("Push subscription error:", error);
      const message = error instanceof Error ? error.message : "Failed to enable notifications";
      showToast(message, "error");
    } finally {
      setIsSubscribing(false);
    }
  }, [user, showToast]);

  return { subscribeUser, isSubscribing };
}
