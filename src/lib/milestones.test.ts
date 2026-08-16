import { describe, expect, it } from "vitest";
import { checkNewMilestones, getHistoricalMilestoneUnlocks, getMilestoneById, MILESTONES } from "./milestones";

describe("getMilestoneById", () => {
  it("finds a milestone that exists", () => {
    expect(getMilestoneById("streak_7")?.label).toBe("Weekly Reflection Habit");
  });

  it("returns undefined for an unknown id", () => {
    expect(getMilestoneById("does_not_exist")).toBeUndefined();
  });
});

describe("checkNewMilestones", () => {
  it("unlocks first_reflection only on the first post", () => {
    const unlocked = checkNewMilestones({
      existingMilestoneIds: [],
      totalPostCount: 1,
      newStreakDays: 1,
      postHour: 12,
      isFirstPost: true,
    });
    expect(unlocked).toContain("first_reflection");
  });

  it("does not re-award milestones the user already has", () => {
    const unlocked = checkNewMilestones({
      existingMilestoneIds: ["first_reflection", "streak_3"],
      totalPostCount: 4,
      newStreakDays: 3,
      postHour: 12,
      isFirstPost: false,
    });
    expect(unlocked).not.toContain("first_reflection");
    expect(unlocked).not.toContain("streak_3");
  });

  it("unlocks every streak tier crossed in a single jump", () => {
    const unlocked = checkNewMilestones({
      existingMilestoneIds: [],
      totalPostCount: 1,
      newStreakDays: 30,
      postHour: 12,
      isFirstPost: false,
    });
    expect(unlocked).toEqual(expect.arrayContaining(["streak_3", "streak_7", "streak_14", "streak_30"]));
    expect(unlocked).not.toContain("streak_100");
  });

  it("unlocks early_bird before 6am and night_owl at/after 11pm", () => {
    expect(checkNewMilestones({ existingMilestoneIds: [], totalPostCount: 1, newStreakDays: 1, postHour: 5, isFirstPost: false })).toContain("early_bird");
    expect(checkNewMilestones({ existingMilestoneIds: [], totalPostCount: 1, newStreakDays: 1, postHour: 23, isFirstPost: false })).toContain("night_owl");
    expect(checkNewMilestones({ existingMilestoneIds: [], totalPostCount: 1, newStreakDays: 1, postHour: 12, isFirstPost: false })).not.toContain("early_bird");
  });
});

describe("getHistoricalMilestoneUnlocks", () => {
  it("returns nothing for a user with no reflections", () => {
    expect(getHistoricalMilestoneUnlocks([])).toEqual([]);
  });

  it("computes the longest streak from historical dates, not just the count", () => {
    const reflections = [
      { createdAt: "2024-01-01T10:00:00Z" },
      { createdAt: "2024-01-02T10:00:00Z" },
      { createdAt: "2024-01-03T10:00:00Z" },
      // gap
      { createdAt: "2024-02-01T10:00:00Z" },
    ];
    const unlocks = getHistoricalMilestoneUnlocks(reflections);
    expect(unlocks).toContain("streak_3");
    expect(unlocks).not.toContain("streak_7");
    expect(unlocks).toContain("first_reflection");
  });

  it("does not double-count multiple posts made on the same day toward the streak", () => {
    const reflections = [
      { createdAt: "2024-01-01T08:00:00Z" },
      { createdAt: "2024-01-01T20:00:00Z" },
    ];
    const unlocks = getHistoricalMilestoneUnlocks(reflections);
    expect(unlocks).not.toContain("streak_3");
  });

  it("skips milestones already recorded as earned", () => {
    const reflections = [{ createdAt: "2024-01-01T10:00:00Z" }];
    const unlocks = getHistoricalMilestoneUnlocks(reflections, ["first_reflection"]);
    expect(unlocks).not.toContain("first_reflection");
  });

  it("every milestone id used by the checker exists in MILESTONES", () => {
    const ids = new Set(MILESTONES.map((m) => m.id));
    const reflections = Array.from({ length: 100 }, (_, i) => ({
      createdAt: new Date(2024, 0, i + 1, 3).toISOString(),
    }));
    const unlocks = getHistoricalMilestoneUnlocks(reflections);
    unlocks.forEach((id) => expect(ids.has(id)).toBe(true));
  });
});
