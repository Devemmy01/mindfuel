import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearDraft, loadDraft, saveDraft } from "./draft";

function memoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  };
}

describe("reflection draft", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", memoryStorage());
  });

  it("round-trips text, prompt and visibility", () => {
    saveDraft({ text: "Rest is part of the work", prompt: "What did today teach you?", promptId: "p1", visibility: "private" });
    expect(loadDraft()).toMatchObject({ text: "Rest is part of the work", promptId: "p1", visibility: "private" });
  });

  it("drops empty drafts and clears on request", () => {
    saveDraft({ text: "keep" });
    saveDraft({ text: "   " });
    expect(loadDraft()).toBeNull();
    saveDraft({ text: "keep" });
    clearDraft();
    expect(loadDraft()).toBeNull();
  });

  it("expires drafts older than a week", () => {
    saveDraft({ text: "old" });
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 8 * 24 * 60 * 60 * 1000);
    expect(loadDraft()).toBeNull();
    vi.restoreAllMocks();
  });
});
