import { describe, expect, it } from "vitest";
import { composeHref } from "./links";

describe("composeHref", () => {
  it("opens the composer on the prompt with an optional source", () => {
    const href = composeHref({ id: "q1", question: "What did today teach you?" }, "push");
    const url = new URL(href, "https://x.test");
    expect(url.pathname).toBe("/create");
    expect(url.searchParams.get("prompt")).toBe("What did today teach you?");
    expect(url.searchParams.get("promptId")).toBe("q1");
    expect(url.searchParams.get("source")).toBe("push");
  });
});
