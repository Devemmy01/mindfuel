import { describe, expect, it, vi } from "vitest";

vi.mock("@/models/follow", () => ({ default: {} }));
vi.mock("@/models/post", () => ({ default: {} }));
vi.mock("@/models/user", () => ({ default: {} }));

import { digestHeadline, digestWindowStart } from "@/lib/following-digest";
import { digestDue, DIGEST_HOUR, canNotify } from "@/lib/notification-policy";

describe("following digest", () => {
  it("names one, two, or two plus others", () => {
    expect(digestHeadline({ authorNames: ["Ada"], totalPosts: 1 })).toBe("Ada shared a new reflection");
    expect(digestHeadline({ authorNames: ["Ada"], totalPosts: 3 })).toBe("Ada shared new reflections");
    expect(digestHeadline({ authorNames: ["Ada", "Tolu"], totalPosts: 2 })).toBe("Ada and Tolu shared new reflections");
    expect(digestHeadline({ authorNames: ["Ada", "Tolu", "Kemi"], totalPosts: 4 })).toBe("Ada, Tolu and 1 other shared new reflections");
    expect(digestHeadline({ authorNames: ["Ada", "Tolu", "Kemi", "Bo"], totalPosts: 4 })).toBe("Ada, Tolu and 2 others shared new reflections");
  });

  it("starts the window at the last digest, a day back for the first, and never over a week", () => {
    const now = new Date("2026-11-10T08:00:00Z");
    expect(digestWindowStart(new Date("2026-11-09T08:00:00Z"), now).toISOString()).toBe("2026-11-09T08:00:00.000Z");
    expect(digestWindowStart(null, now).toISOString()).toBe("2026-11-09T08:00:00.000Z");
    expect(digestWindowStart(new Date("2026-01-01T00:00:00Z"), now).toISOString()).toBe("2026-11-03T08:00:00.000Z");
  });

  it("is due at 8am local, once per local day, and respects the email switch", () => {
    const lagos = { notificationSettings: { timezone: "Africa/Lagos" } }; // UTC+1
    const eightLagos = new Date(`2026-11-10T0${DIGEST_HOUR - 1}:30:00Z`);
    expect(digestDue(lagos, eightLagos)).toBe(true);
    expect(digestDue(lagos, new Date("2026-11-10T08:30:00Z"))).toBe(false);
    expect(digestDue({ ...lagos, lastDigestSentOn: "2026-11-10" }, eightLagos)).toBe(false);
    expect(digestDue({ notificationSettings: { timezone: "Africa/Lagos", email: { following: false } } }, eightLagos)).toBe(false);
    // The legacy "no emails" switch turns it off too.
    expect(digestDue({ ...lagos, preferences: { dailyEmail: false } }, eightLagos)).toBe(false);
  });

  it("is an email-only category", () => {
    expect(canNotify({ notificationSettings: { push: { following: true } } }, "following", "push")).toEqual({ ok: false, reason: "preference" });
    expect(canNotify({}, "following", "email")).toEqual({ ok: true });
  });
});
