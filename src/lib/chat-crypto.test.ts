import { describe, expect, it } from "vitest";
import { decryptChatBytes, decryptChatText, encryptChatBytes, encryptChatText } from "@/lib/chat-crypto";

const newKey = () => crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);

describe("decrypting with a conversation's key history", () => {
  it("opens a message sent under an older key when given the full keyring", async () => {
    const [oldKey, currentKey] = await Promise.all([newKey(), newKey()]);
    const sent = await encryptChatText(oldKey, "sent before the reset");
    await expect(decryptChatText(currentKey, sent.ciphertext, sent.iv)).rejects.toThrow();
    await expect(decryptChatText([currentKey, oldKey], sent.ciphertext, sent.iv)).resolves.toBe("sent before the reset");
  });

  it("does the same for photo bytes", async () => {
    const [oldKey, currentKey] = await Promise.all([newKey(), newKey()]);
    const sent = await encryptChatBytes(oldKey, new Uint8Array([1, 2, 3]));
    const plain = await decryptChatBytes([currentKey, oldKey], sent.data, sent.iv);
    expect(Array.from(new Uint8Array(plain))).toEqual([1, 2, 3]);
  });

  it("still fails when no key in the ring matches", async () => {
    const [a, b, c] = await Promise.all([newKey(), newKey(), newKey()]);
    const sent = await encryptChatText(a, "hi");
    await expect(decryptChatText([b, c], sent.ciphertext, sent.iv)).rejects.toThrow();
  });
});
