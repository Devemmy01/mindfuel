import { describe, expect, it } from "vitest";
import { decayStreak, formatStreak, getStreakMilestoneMessage, recalculateStreakFromPosts, updateStreak } from "./streakUtils";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d;
}

describe("updateStreak", () => {
  it("starts a streak at 1 on the first ever reflection", () => {
    const result = updateStreak(undefined, 0, 0);
    expect(result.streakDays).toBe(1);
    expect(result.longestStreak).toBe(1);
  });

  it("does not change the streak when reflecting again the same day", () => {
    const result = updateStreak(daysAgo(0), 4, 4);
    expect(result.streakDays).toBe(4);
  });

  it("increments the streak when the last reflection was yesterday", () => {
    const result = updateStreak(daysAgo(1), 4, 4);
    expect(result.streakDays).toBe(5);
    expect(result.longestStreak).toBe(5);
  });

  it("resets the streak to 1 after a missed day", () => {
    const result = updateStreak(daysAgo(2), 4, 10);
    expect(result.streakDays).toBe(1);
    expect(result.longestStreak).toBe(10);
  });

  it("preserves the longest streak even when the current streak resets", () => {
    const result = updateStreak(daysAgo(5), 2, 30);
    expect(result.longestStreak).toBe(30);
  });
});

describe("decayStreak", () => {
  it("returns 0 when there is no last reflection date", () => {
    expect(decayStreak(undefined, 5)).toBe(0);
  });

  it("keeps the streak when the last reflection was today", () => {
    expect(decayStreak(daysAgo(0), 5)).toBe(5);
  });

  it("keeps the streak when the last reflection was yesterday", () => {
    expect(decayStreak(daysAgo(1), 5)).toBe(5);
  });

  it("breaks the streak when the last reflection was more than a day ago", () => {
    expect(decayStreak(daysAgo(2), 5)).toBe(0);
  });
});

describe("formatStreak", () => {
  it("prompts to start a streak at 0", () => {
    expect(formatStreak(0)).toBe("Start your streak");
  });

  it("uses singular day for 1", () => {
    expect(formatStreak(1)).toBe("🔥 1 day");
  });

  it("uses plural days otherwise", () => {
    expect(formatStreak(7)).toBe("🔥 7 days");
  });
});

describe("getStreakMilestoneMessage", () => {
  it("returns a message on milestone days", () => {
    expect(getStreakMilestoneMessage(7)).toMatch(/week/i);
  });

  it("returns null on non-milestone days", () => {
    expect(getStreakMilestoneMessage(4)).toBeNull();
  });
});

describe("recalculateStreakFromPosts", () => {
  it("returns a zeroed streak when there are no posts left", () => {
    const result = recalculateStreakFromPosts([], 12);
    expect(result).toEqual({ streakDays: 0, lastReflectionDate: undefined, longestStreak: 12 });
  });

  it("counts consecutive days backwards from the most recent post", () => {
    const postDates = [daysAgo(0), daysAgo(1), daysAgo(2), daysAgo(4)];
    const result = recalculateStreakFromPosts(postDates, 12);
    expect(result.streakDays).toBe(3);
  });

  it("preserves the longest streak while recomputing the current one", () => {
    const result = recalculateStreakFromPosts([daysAgo(0)], 20);
    expect(result.longestStreak).toBe(20);
  });
});
