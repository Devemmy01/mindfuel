import { beforeEach, describe, expect, it, vi } from "vitest";
import { addToOutbox, readOutbox, removeFromOutbox } from "./chat-outbox";

function memoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
}

const entry = (id: string, minutesAgo: number) => ({
  clientMessageId: id,
  conversationId: "c1",
  payload: { ciphertext: "x", iv: "y", encryptionVersion: 1 },
  text: id,
  createdAt: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
});

describe("chat outbox", () => {
  beforeEach(() => vi.stubGlobal("localStorage", memoryStorage()));

  it("keeps messages in the order they were written", () => {
    addToOutbox("u", entry("second", 1));
    addToOutbox("u", entry("first", 3));
    addToOutbox("u", entry("third", 0));
    expect(readOutbox("u").map((item) => item.clientMessageId)).toEqual(["first", "second", "third"]);
  });

  it("dedupes by id, removes on success, and is per user", () => {
    addToOutbox("u", entry("a", 1));
    addToOutbox("u", entry("a", 1));
    expect(readOutbox("u")).toHaveLength(1);
    expect(readOutbox("someone-else")).toHaveLength(0);
    removeFromOutbox("u", "a");
    expect(readOutbox("u")).toHaveLength(0);
  });
});
