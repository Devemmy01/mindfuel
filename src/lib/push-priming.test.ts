import { beforeEach, describe, expect, it, vi } from "vitest";
import { recordReminderDecline, shouldOfferReminders } from "./push-priming";

function memoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  };
}

describe("push priming", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", memoryStorage());
    vi.stubGlobal("window", {
      matchMedia: () => ({ matches: false }),
      PushManager: function PushManager() {},
      Notification: { permission: "default" },
    });
    vi.stubGlobal("Notification", { permission: "default" });
    vi.stubGlobal("navigator", { userAgent: "Android", platform: "Linux", maxTouchPoints: 5, serviceWorker: {} });
  });

  it("offers once, then waits 14 days after each decline, at most three times", () => {
    const day = 24 * 60 * 60 * 1000;
    const start = 1_800_000_000_000;
    expect(shouldOfferReminders(start)).toBe(true);
    recordReminderDecline(start);
    expect(shouldOfferReminders(start + 13 * day)).toBe(false);
    expect(shouldOfferReminders(start + 14 * day)).toBe(true);
    recordReminderDecline(start + 14 * day);
    recordReminderDecline(start + 28 * day);
    expect(shouldOfferReminders(start + 100 * day)).toBe(false);
  });

  it("never offers once the browser permission was decided", () => {
    vi.stubGlobal("Notification", { permission: "denied" });
    expect(shouldOfferReminders()).toBe(false);
  });
});
