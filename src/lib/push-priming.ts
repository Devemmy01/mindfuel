/**
 * When to offer push reminders. The browser permission prompt is only ever
 * triggered from a click on our own explanation ("priming"), never on load.
 */
const KEY = "mindfuel:push-priming:v1";
const REASK_AFTER_MS = 14 * 24 * 60 * 60 * 1000;
const MAX_ASKS = 3;

type PrimingState = { declines: number; lastDeclinedAt: number };

function read(): PrimingState {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "null") as PrimingState | null;
    return value && typeof value.declines === "number" ? value : { declines: 0, lastDeclinedAt: 0 };
  } catch {
    return { declines: 0, lastDeclinedAt: 0 };
  }
}

export type PushSupport = "supported" | "ios-needs-install" | "unsupported";

export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  // iOS only delivers web push to Home Screen apps (iOS 16.4+).
  if (isIOS && !standalone) return "ios-needs-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  return "supported";
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/** Whether to offer reminders now (after a value moment, never on load). */
export function shouldOfferReminders(now = Date.now()) {
  const support = pushSupport();
  if (support === "unsupported") return false;
  if (support === "supported" && notificationPermission() !== "default") return false;
  const state = read();
  if (state.declines >= MAX_ASKS) return false;
  return state.declines === 0 || now - state.lastDeclinedAt >= REASK_AFTER_MS;
}

export function recordReminderDecline(now = Date.now()) {
  const state = read();
  try {
    localStorage.setItem(KEY, JSON.stringify({ declines: state.declines + 1, lastDeclinedAt: now }));
  } catch {
    // If storage is unavailable we simply may ask again next time.
  }
}
