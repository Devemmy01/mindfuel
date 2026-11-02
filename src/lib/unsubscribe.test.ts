import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { unsubscribeFor, unsubscribeToken, verifyUnsubscribeToken } from "./unsubscribe";

describe("unsubscribe tokens", () => {
  beforeEach(() => {
    process.env.UNSUBSCRIBE_SECRET = "test-secret";
  });
  afterEach(() => {
    delete process.env.UNSUBSCRIBE_SECRET;
  });

  it("round-trips and rejects tampering", () => {
    const token = unsubscribeToken("665f00000000000000000001", "daily")!;
    expect(verifyUnsubscribeToken(token)).toEqual({ userId: "665f00000000000000000001", category: "daily" });
    expect(verifyUnsubscribeToken(token.replace("daily", "product"))).toBeNull();
    expect(verifyUnsubscribeToken("665f.daily.bad")).toBeNull();
  });

  it("adds one-click headers when a secret exists, and falls back to settings without one", () => {
    expect(unsubscribeFor("u1", "product").headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    delete process.env.UNSUBSCRIBE_SECRET;
    const fallback = unsubscribeFor("u1", "product");
    expect(fallback.url).toMatch(/\/settings\/notifications$/);
    expect(fallback.headers).toEqual({});
  });
});
