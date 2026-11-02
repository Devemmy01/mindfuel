import { describe, expect, it } from "vitest";
import { canNotify, DAILY_PUSH_CAP, inQuietHours, localParts, reminderDue, resolveSettings } from "./notification-policy";

const at = (iso: string) => new Date(iso);

describe("resolveSettings", () => {
  it("uses defaults: likes stay off, replies on", () => {
    const settings = resolveSettings({});
    expect(settings.push.likes).toBe(false);
    expect(settings.push.replies).toBe(true);
  });

  it("honours the legacy switches, then explicit choices", () => {
    expect(resolveSettings({ preferences: { notifications: false } }).push.messages).toBe(false);
    expect(resolveSettings({ preferences: { dailyEmail: false } }).email.daily).toBe(false);
    expect(resolveSettings({ preferences: { notifications: false }, notificationSettings: { push: { messages: true } } }).push.messages).toBe(true);
  });

  it("rejects invalid timezones and hours", () => {
    const settings = resolveSettings({ notificationSettings: { timezone: "Mars/Base", reminderHour: 30 } });
    expect(settings.timezone).toBe("UTC");
    expect(settings.reminderHour).toBe(20);
  });
});

describe("timezones and DST", () => {
  it("reads local wall-clock time", () => {
    expect(localParts(at("2026-03-08T07:30:00Z"), "America/New_York").hour).toBe(3); // after spring-forward (EDT)
    expect(localParts(at("2026-03-08T06:30:00Z"), "America/New_York").hour).toBe(1); // before (EST)
    expect(localParts(at("2026-11-02T23:30:00Z"), "Africa/Lagos").date).toBe("2026-11-03");
  });

  it("handles quiet hours that cross midnight", () => {
    const settings = resolveSettings({ notificationSettings: { timezone: "UTC", quietStart: 22, quietEnd: 7 } });
    expect(inQuietHours(settings, at("2026-11-02T23:00:00Z"))).toBe(true);
    expect(inQuietHours(settings, at("2026-11-02T06:59:00Z"))).toBe(true);
    expect(inQuietHours(settings, at("2026-11-02T12:00:00Z"))).toBe(false);
  });
});

describe("canNotify", () => {
  const noon = at("2026-11-02T12:00:00Z");

  it("blocks categories the person turned off", () => {
    expect(canNotify({}, "likes", "push", noon)).toEqual({ ok: false, reason: "preference" });
  });

  it("holds non-message pushes during quiet hours", () => {
    const night = at("2026-11-02T23:00:00Z");
    expect(canNotify({}, "replies", "push", night)).toEqual({ ok: false, reason: "quiet-hours" });
    expect(canNotify({}, "messages", "push", night)).toEqual({ ok: true });
  });

  it("caps non-message pushes per local day", () => {
    const user = { pushDay: "2026-11-02", pushSentToday: DAILY_PUSH_CAP };
    expect(canNotify(user, "replies", "push", noon)).toEqual({ ok: false, reason: "daily-cap" });
    expect(canNotify({ ...user, pushDay: "2026-11-01" }, "replies", "push", noon)).toEqual({ ok: true });
  });
});

describe("reminderDue", () => {
  const user = { notificationSettings: { timezone: "Africa/Lagos", reminderHour: 20 } };

  it("fires once at the chosen local hour", () => {
    expect(reminderDue(user, at("2026-11-02T19:10:00Z"))).toBe(true); // 20:10 in Lagos
    expect(reminderDue(user, at("2026-11-02T18:10:00Z"))).toBe(false);
    expect(reminderDue({ ...user, lastReminderSentOn: "2026-11-02" }, at("2026-11-02T19:10:00Z"))).toBe(false);
  });

  it("skips people who already reflected today, and weekends when asked", () => {
    expect(reminderDue({ ...user, lastReflectionDate: "2026-11-02T08:00:00Z" }, at("2026-11-02T19:10:00Z"))).toBe(false);
    const weekend = { notificationSettings: { ...user.notificationSettings, skipWeekends: true } };
    expect(reminderDue(weekend, at("2026-11-07T19:10:00Z"))).toBe(false); // Saturday
  });
});
