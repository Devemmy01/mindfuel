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

      // 2. Acquire an active Service Worker registration.
      //
      // Strategy:
      //  a) Check ALL existing registrations for one that already has an active worker.
      //     next-pwa auto-registers /sw.js at scope "/" — we don't need to call
      //     register() again, which would trigger an update-check that causes the
      //     installing worker to become "redundant" if a SW is already running.
      //  b) Only if nothing is active do we register fresh.
      //  c) If we end up waiting on an installing worker that goes "redundant"
      //     (meaning a different/newer worker superseded it), we re-query the
      //     registration to pick up the winner instead of throwing.
      console.log("Push: Acquiring active Service Worker...");
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

        // (a) Find any registration that already exists for this origin.
        // We check active || installing || waiting — if ANY of these exist
        // there is already a registration in progress and we must NOT call
        // register() again, which would trigger a conflicting install and
        // cause the current worker to go "redundant".
        const allRegistrations = await navigator.serviceWorker.getRegistrations();
        const existingRegistration = allRegistrations.find(
          (r) => r.active || r.installing || r.waiting
        );

        if (existingRegistration) {
          console.log("Push: Found existing SW registration at scope", existingRegistration.scope);
          registration = existingRegistration;
        } else {
          // (b) No SW at all — register fresh.
          console.log("Push: No SW found. Registering", swUrl);
          registration = await navigator.serviceWorker.register(swUrl);
        }

        // (c) If the registration isn't active yet, wait for it.
        if (!registration.active) {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error("Service Worker failed to reach active state in time."));
            }, 15000);

            // Double-check: may have activated between the check above and now.
            if (registration?.active) {
              clearTimeout(timeout);
              resolve();
              return;
            }

            const worker = registration?.installing || registration?.waiting;

            if (worker) {
              const stateHandler = () => {
                if (worker.state === "activated") {
                  worker.removeEventListener("statechange", stateHandler);
                  clearTimeout(timeout);
                  resolve();
                } else if (worker.state === "redundant") {
                  worker.removeEventListener("statechange", stateHandler);
                  clearTimeout(timeout);
                  // A newer SW superseded the one we were watching.
                  // Re-query for whoever won the race.
                  if (registration?.active) {
                    resolve();
                  } else {
                    // Give it 500 ms for clientsClaim() to propagate.
                    setTimeout(() => {
                      if (registration?.active) {
                        resolve();
                      } else {
                        reject(new Error("Service Worker became redundant before activating."));
                      }
                    }, 500);
                  }
                }
              };
              worker.addEventListener("statechange", stateHandler);
            } else {
              // No worker in any pending state — poll until active.
              const interval = setInterval(() => {
                if (registration?.active) {
                  clearInterval(interval);
                  clearTimeout(timeout);
                  resolve();
                }
              }, 200);
            }
          });
        }

        console.log("Push: Service Worker is ACTIVE at", registration?.scope);
      } catch (regError: unknown) {
        console.warn("Push: Worker acquisition failed", regError);
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
