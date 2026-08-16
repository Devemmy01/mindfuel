import { describe, expect, it } from "vitest";
import { getUserHandle } from "./userHandle";

describe("getUserHandle", () => {
  it("prefers the saved username when present", () => {
    expect(getUserHandle({ username: "JaneDoe", name: "Someone Else" })).toBe("janedoe");
  });

  it("strips a leading @ from a saved username", () => {
    expect(getUserHandle({ username: "@jane" })).toBe("jane");
  });

  it("falls back to a slugified name when there is no username", () => {
    expect(getUserHandle({ name: "Jane Doe" })).toBe("janedoe");
  });

  it("strips accents and non-alphanumeric characters from the name fallback", () => {
    expect(getUserHandle({ name: "José Álvarez!" })).toBe("josealvarez");
  });

  it("truncates the name fallback to 20 characters", () => {
    const handle = getUserHandle({ name: "A Very Long Full Name Indeed" });
    expect(handle.length).toBeLessThanOrEqual(20);
  });

  it("falls back to 'member' when there is nothing usable", () => {
    expect(getUserHandle(null)).toBe("member");
    expect(getUserHandle({})).toBe("member");
  });
});
