import { describe, expect, it } from "vitest";
import { isValidRecoveryPin, normalizeRecoveryPin, RECOVERY_PIN_MAX_LENGTH, RECOVERY_PIN_MIN_LENGTH } from "./chat-recovery-shared";
import { decryptChatBytes, decryptChatText, encryptChatBytes, encryptChatText } from "./chat-crypto";

describe("normalizeRecoveryPin", () => {
  it("strips everything but digits", () => {
    expect(normalizeRecoveryPin("482-913")).toBe("482913");
  });

  it("strips whitespace and other stray characters a user might type", () => {
    expect(normalizeRecoveryPin(" 482 913 ")).toBe("482913");
  });

  it("is idempotent so an already-clean PIN still matches", () => {
    expect(normalizeRecoveryPin(normalizeRecoveryPin("482913"))).toBe("482913");
  });
});

describe("isValidRecoveryPin", () => {
  it(`rejects PINs shorter than ${RECOVERY_PIN_MIN_LENGTH} digits`, () => {
    expect(isValidRecoveryPin("12345")).toBe(false);
  });

  it(`accepts PINs from ${RECOVERY_PIN_MIN_LENGTH} to ${RECOVERY_PIN_MAX_LENGTH} digits`, () => {
    expect(isValidRecoveryPin("123456")).toBe(true);
    expect(isValidRecoveryPin("1234567890")).toBe(true);
  });

  it(`rejects PINs longer than ${RECOVERY_PIN_MAX_LENGTH} digits`, () => {
    expect(isValidRecoveryPin("12345678901")).toBe(false);
  });

  it("ignores separators when checking length", () => {
    expect(isValidRecoveryPin("482-913")).toBe(true);
  });
});

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
