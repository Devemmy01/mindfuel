"use client";

import React from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * "New version available": a waiting service worker takes over only when the
 * person chooses, instead of the app silently staying on old code until every
 * tab closes.
 */
export default function UpdateBanner() {
  const [waiting, setWaiting] = React.useState<ServiceWorker | null>(null);

  React.useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    let registration: ServiceWorkerRegistration | undefined;
    let reloading = false;

    const track = (worker: ServiceWorker | null) => {
      if (!worker) return;
      const check = () => {
        // Only an *update* (an existing controller) needs a refresh prompt.
        if (worker.state === "installed" && navigator.serviceWorker.controller) setWaiting(worker);
      };
      check();
      worker.addEventListener("statechange", check);
    };

    const attach = async () => {
      registration = await navigator.serviceWorker.getRegistration("/");
      if (!registration) return;
      track(registration.waiting);
      registration.addEventListener("updatefound", () => track(registration?.installing ?? null));
    };

    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void registration?.update().catch(() => undefined);
    };

    void attach();
    // The worker is registered after sign-in, so look again shortly.
    const retry = window.setTimeout(() => void attach(), 5_000);
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(retry);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!waiting) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-[calc(var(--toast-offset,1rem)+env(safe-area-inset-bottom))] z-toast flex items-center gap-3 rounded-card border border-line bg-surface-raised px-4 py-3 shadow-e3 sm:inset-x-auto sm:left-1/2 sm:w-[26rem] sm:-translate-x-1/2"
    >
      <RefreshCw className="size-4 shrink-0 text-primary-text" aria-hidden />
      <p className="flex-1 text-body-sm">A new version of MindFuel is ready.</p>
      <Button size="sm" onClick={() => waiting.postMessage({ type: "SKIP_WAITING" })}>Refresh</Button>
    </div>
  );
}
