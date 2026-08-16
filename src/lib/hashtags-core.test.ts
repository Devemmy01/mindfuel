import { describe, expect, it } from "vitest";
import { extractHashtags, formatHashtag, hashtagTextToPath, levenshteinDistance, normalizeHashtag } from "./hashtags-core";

describe("normalizeHashtag", () => {
  it("strips a leading # and lowercases", () => {
    expect(normalizeHashtag("#Growth")).toBe("growth");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeHashtag("  mindful  ")).toBe("mindful");
  });
});

describe("formatHashtag", () => {
  it("re-adds a single leading #", () => {
    expect(formatHashtag("Growth")).toBe("#growth");
  });
});

describe("extractHashtags", () => {
  it("extracts multiple distinct hashtags from a post", () => {
    expect(extractHashtags("Today I learned about #growth and #mindfulness.")).toEqual(["growth", "mindfulness"]);
  });

  it("deduplicates repeated hashtags case-insensitively", () => {
    expect(extractHashtags("#Growth is key. #growth every day.")).toEqual(["growth"]);
  });

  it("ignores a bare # with no word characters after it", () => {
    expect(extractHashtags("just a # symbol")).toEqual([]);
  });

  it("does not treat a mid-word # as a hashtag", () => {
    expect(extractHashtags("price is $5#off")).toEqual([]);
  });

  it("caps results at 10 hashtags", () => {
    const text = Array.from({ length: 15 }, (_, i) => `#tag${i}`).join(" ");
    expect(extractHashtags(text)).toHaveLength(10);
  });
});

describe("hashtagTextToPath", () => {
  it("builds a normalized, encoded hashtag path", () => {
    expect(hashtagTextToPath("#Deep Focus")).toBe("/hashtags/deep%20focus");
  });
});

describe("levenshteinDistance", () => {
  it("is 0 for identical strings ignoring case", () => {
    expect(levenshteinDistance("Growth", "growth")).toBe(0);
  });

  it("counts a single substitution as distance 1", () => {
    expect(levenshteinDistance("mindful", "mindfup")).toBe(1);
  });

  it("counts insertions and deletions", () => {
    expect(levenshteinDistance("cat", "cats")).toBe(1);
    expect(levenshteinDistance("", "abc")).toBe(3);
  });
});
