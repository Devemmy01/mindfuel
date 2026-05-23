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
      const permission = await Promise.race([
        Notification.requestPermission(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Permission request timed out")), 5000))
      ]) as NotificationPermission;

      if (permission !== "granted") {
        console.warn("Push: Permission denied by user");
        showToast("Notification permission denied", "warning");
        return;
      }

      // 2. Register/Ready Service Worker with timeout
      console.log("Push: Ensuring Service Worker is registered...");
      let registration: ServiceWorkerRegistration | undefined;
      
      try {
        const swUrl = window.location.hostname === "localhost" ? "/dev-sw.js" : "/sw.js";
        console.log(`Push: Registering worker at ${swUrl}...`);
        registration = await navigator.serviceWorker.register(swUrl);
        console.log("Push: Service Worker registered", registration.scope);
        
        // WAIT for the Service Worker to be ACTIVE
        // This is crucial to avoid "no active Service Worker" errors
        let retryCount = 0;
        while (!registration.active && retryCount < 30) {
          console.log(`Push: Waiting for SW to activate... (Attempt ${retryCount + 1})`);
          
          const worker = registration.installing || registration.waiting;
          if (worker) {
            await new Promise<void>((resolve) => {
              const handler = () => {
                if (worker.state === "activated" || worker.state === "redundant") {
                  worker.removeEventListener("statechange", handler);
                  resolve();
                }
              };
              worker.addEventListener("statechange", handler);
              setTimeout(resolve, 1000); // 1s safety fallback
            });
          } else {
            await new Promise(r => setTimeout(r, 500));
          }

          // Refresh registration object using register (which is fast and scope-safe)
          registration = await navigator.serviceWorker.register(swUrl);
          retryCount++;
        }

        if (registration?.active) {
          console.log("Push: Service Worker is now ACTIVE!");
        } else {
          // If still not active, check if there's any active registration on the scope
          const fallbackReg = await navigator.serviceWorker.getRegistration(registration?.scope || "/");
          if (fallbackReg?.active) {
            registration = fallbackReg;
            console.log("Push: Service Worker is active via fallback registration!");
          } else {
            throw new Error("Service Worker failed to reach active state in time.");
          }
        }
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
