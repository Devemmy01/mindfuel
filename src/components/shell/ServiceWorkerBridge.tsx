"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Messages from the service worker: navigate to a notification's target when
 * the worker could not, and refresh counts when a push arrives.
 */
export default function ServiceWorkerBridge() {
  const router = useRouter();
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; url?: string } | null;
      if (data?.type === "mindfuel:navigate" && data.url) {
        try {
          const url = new URL(data.url, window.location.origin);
          if (url.origin === window.location.origin) router.push(`${url.pathname}${url.search}${url.hash}`);
        } catch {
          // Ignore malformed targets.
        }
      } else if (data?.type === "mindfuel:push") {
        window.dispatchEvent(new Event("mindfuel:push-received"));
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [router]);
  return null;
}
