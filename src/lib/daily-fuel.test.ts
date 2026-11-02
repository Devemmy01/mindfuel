import { describe, expect, it } from "vitest";
import { ALL_FUEL_POOLS, THEMES, mindsetItems, pickItem, poolFor, shorten, streakLine, subjectFor, themeFor } from "./daily-fuel";

describe("Daily Fuel", () => {
  it("gives every weekday its own theme", () => {
    expect(new Set(THEMES.map((theme) => theme.label)).size).toBe(7);
    expect(themeFor(new Date("2026-11-03T05:00:00Z")).label).toBe("Try-This Tuesday");
    expect(themeFor(new Date("2026-11-08T05:00:00Z")).label).toBe("Sunday Reset");
  });

  it("never repeats an item until the pool is used up", () => {
    const pool = poolFor(THEMES[2]);
    const seen = new Set<string>();
    for (let day = 0; day < pool.length; day += 1) {
      const { item, exhausted } = pickItem(pool, seen, `a@b.test:${day}`);
      expect(exhausted).toBe(false);
      expect(seen.has(item.id)).toBe(false);
      seen.add(item.id);
    }
    expect(pickItem(pool, seen, "a@b.test:next").exhausted).toBe(true);
  });

  it("has unique ids and titles, and subjects short enough for a phone inbox", () => {
    for (const theme of THEMES) {
      const pool = poolFor(theme, ["A screened quote that came from the tips collection."]);
      expect(pool.length).toBeGreaterThan(10);
      expect(new Set(pool.map((item) => item.id)).size).toBe(pool.length);
      expect(new Set(pool.map((item) => item.title)).size).toBe(pool.length);
      for (const item of pool) expect(subjectFor(theme, item).length).toBeLessThanOrEqual(80);
    }
    // Each theme comes round once a week, so even the smallest pool (15) lasts about four months.
    expect(Math.min(...Object.values(ALL_FUEL_POOLS).filter((pool) => pool.length).map((pool) => pool.length))).toBeGreaterThanOrEqual(15);
  });

  it("maps synced tips onto Monday without duplicates", () => {
    const items = mindsetItems(["Breathe.", "Breathe."]);
    expect(items.filter((item) => item.body === "Breathe.")).toHaveLength(1);
  });

  it("writes a kind streak line for each situation", () => {
    const now = new Date("2026-11-03T05:00:00Z");
    expect(streakLine(4, "2026-11-02T20:00:00Z", now)).toBe("You're on a 4-day streak. Keep the flame lit today.");
    expect(streakLine(1, "2026-11-02T20:00:00Z", now)).toMatch(/Day 2/);
    expect(streakLine(0, "2026-10-25T20:00:00Z", now)).toMatch(/misses you/);
    expect(streakLine(0, null, now)).toMatch(/first reflection/);
    expect(streakLine(0, "2026-01-01T00:00:00Z", now)).toBeNull();
  });

  it("shortens on a word boundary", () => {
    expect(shorten("When a task feels heavy, reduce it to the smallest action that creates movement.", 40)).toBe("When a task feels heavy, reduce it to…");
  });
});
