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
        } catch {
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

      // 2. Acquire the root Service Worker registration used by next-pwa.
      // We use the registration directly instead of waiting on `ready`, which
      // can stall while the browser is promoting the worker during deploys.
      console.log("Push: Acquiring active Service Worker...");
      let registration: ServiceWorkerRegistration | undefined;

      try {
        registration = await navigator.serviceWorker.getRegistration("/");

        if (!registration) {
          console.log("Push: No root SW found. Registering /sw.js");
          registration = await navigator.serviceWorker.register("/sw.js", {
            scope: "/",
            updateViaCache: "none",
          });
        }

        if (!registration.active) {
          console.log("Push: Waiting briefly for the worker to settle...");
          await new Promise<void>((resolve) => setTimeout(resolve, 750));
        }

        const refreshedRegistration = await navigator.serviceWorker.getRegistration("/");
        if (refreshedRegistration) {
          registration = refreshedRegistration;
        }

        console.log("Push: Service Worker registration ready at", registration.scope);
      } catch (regError: unknown) {
        console.warn("Push: Worker acquisition failed", regError);
        const message = regError instanceof Error ? regError.message : "Unknown activation error";
        throw new Error(`Worker Error: ${message}`);
      }

      if (!registration) throw new Error("No Service Worker registration found");

      // 3. Subscribe to Push, reusing an existing subscription when present.
      console.log("Push: Subscribing to PushManager...");
      const subscription =
        (await registration.pushManager.getSubscription()) ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }));

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
