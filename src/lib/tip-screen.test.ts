import { describe, expect, it } from "vitest";
import { initialTipStatus, screenTip } from "./tip-screen";

describe("screenTip", () => {
  it("rejects the reported off-tone tip", () => {
    expect(screenTip("If you think nobody cares if you're alive, try missing a few payments.")).toMatchObject({ ok: false });
  });

  it.each([
    "When in doubt, just punch it.",
    "Never trust a skinny cook.",
    "Read more at https://example.com",
    "Wine solves most problems.",
    "ok",
  ])("rejects %s", (text) => {
    expect(screenTip(text).ok).toBe(false);
  });

  it.each([
    "Nature does not hurry, yet everything is accomplished.",
    "Notice one thing you did well today, however small.",
    "Rest is part of the work, not a break from it.",
  ])("accepts %s", (text) => {
    expect(screenTip(text)).toEqual({ ok: true });
  });
});

describe("initialTipStatus", () => {
  it("holds joke-advice sources for review even when clean", () => {
    expect(initialTipStatus("Always carry a spare umbrella.", "AdviceSlip")).toBe("pending");
    expect(initialTipStatus("Breathe in slowly and notice where you are.", "ZenQuotes")).toBe("approved");
    expect(initialTipStatus("Nobody cares if you're alive.", "ZenQuotes")).toBe("rejected");
  });
});
