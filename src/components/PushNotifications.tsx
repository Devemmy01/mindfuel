"use client";

import { useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";

export default function PushNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }

    const subscribeToPush = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        
        // Check if subscription already exists
        let subscription = await registration.pushManager.getSubscription();
        
        if (!subscription) {
          const response = await fetch("/api/push/config"); // We'll need this to get the public key
          const { publicKey } = await response.json();
          
          if (!publicKey) return;

          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          });
        }

        // Send subscription to server
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firebaseId: user.uid,
            subscription,
          }),
        });
      } catch (err) {
        console.error("Push subscription failed:", err);
      }
    };

    subscribeToPush();
  }, [user]);

  return null;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
