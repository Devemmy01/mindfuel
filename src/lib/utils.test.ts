import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("keeps a type token and a color together", () => {
    expect(cn("text-body", "text-muted-foreground")).toBe("text-body text-muted-foreground");
  });
  it("dedupes design-system tokens within their group", () => {
    expect(cn("text-caption", "text-h2")).toBe("text-h2");
    expect(cn("rounded-card", "rounded-sheet")).toBe("rounded-sheet");
    expect(cn("z-modal", "z-toast")).toBe("z-toast");
  });
});
