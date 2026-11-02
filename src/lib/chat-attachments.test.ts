import { describe, expect, it } from "vitest";
import { decryptChatBytes, encryptChatBytes } from "./chat-crypto";
import { fitWithin, messagePreviewText, parseEnvelope, serializeEnvelope, type ImageEnvelope } from "./chat-attachments";

const envelope: ImageEnvelope = { t: "image", id: "6a1b2c3d4e5f60718293a4b5", iv: "AAAAAAAAAAAAAAAA", w: 1024, h: 768, mime: "image/jpeg" };

async function key() {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

describe("attachment encryption", () => {
  it("round-trips bytes with the conversation key", async () => {
    const k = await key();
    const bytes = crypto.getRandomValues(new Uint8Array(4096));
    const { data, iv } = await encryptChatBytes(k, bytes);
    expect(new Uint8Array(data)).not.toEqual(bytes);
    expect(new Uint8Array(await decryptChatBytes(k, data, iv))).toEqual(bytes);
  });

  it("rejects tampered ciphertext, a wrong IV, or another conversation's key", async () => {
    const k = await key();
    const { data, iv } = await encryptChatBytes(k, new Uint8Array([1, 2, 3, 4]));
    const tampered = new Uint8Array(data.slice(0));
    tampered[0] ^= 1;
    await expect(decryptChatBytes(k, tampered.buffer, iv)).rejects.toThrow();
    const otherIv = (await encryptChatBytes(k, new Uint8Array([9]))).iv;
    await expect(decryptChatBytes(k, data, otherIv)).rejects.toThrow();
    await expect(decryptChatBytes(await key(), data, iv)).rejects.toThrow();
  });

  it("uses a fresh IV for every file", async () => {
    const k = await key();
    const first = await encryptChatBytes(k, new Uint8Array([1]));
    const second = await encryptChatBytes(k, new Uint8Array([1]));
    expect(first.iv).not.toBe(second.iv);
  });
});

describe("envelopes", () => {
  it("round-trips and keeps an optional caption", () => {
    expect(parseEnvelope(serializeEnvelope(envelope))).toEqual(envelope);
    expect((parseEnvelope(serializeEnvelope({ ...envelope, caption: "Sunset" })) as ImageEnvelope).caption).toBe("Sunset");
  });

  it("treats ordinary text, including JSON-looking text, as text", () => {
    expect(parseEnvelope("hello")).toBeNull();
    expect(parseEnvelope('{"t":"image"}')).toBeNull();
    expect(parseEnvelope('{"a":1}')).toBeNull();
    expect(parseEnvelope(serializeEnvelope({ ...envelope, id: "../../etc" }))).toBeNull();
    expect(parseEnvelope(serializeEnvelope({ ...envelope, mime: "text/html" }))).toBeNull();
  });

  it("previews photos without exposing the envelope", () => {
    expect(messagePreviewText(serializeEnvelope(envelope))).toBe("📷 Photo");
    expect(messagePreviewText(serializeEnvelope({ ...envelope, caption: "Look" }))).toBe("📷 Look");
    expect(messagePreviewText("plain")).toBe("plain");
  });

  it("fits within the size box without upscaling", () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 2048, height: 1536 });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(1000, 5000, 2048)).toEqual({ width: 410, height: 2048 });
  });

  it("carries text with a link preview, and drops unsafe previews", () => {
    const withPreview = { t: "text" as const, text: "Read this", preview: { url: "https://x.test/a", title: "A post", siteName: "X" } };
    expect(parseEnvelope(serializeEnvelope(withPreview))).toEqual({ ...withPreview, preview: { ...withPreview.preview, description: undefined } });
    expect(messagePreviewText(serializeEnvelope(withPreview))).toBe("Read this");
    expect(parseEnvelope(JSON.stringify({ ...withPreview, preview: { url: "javascript:alert(1)", title: "x" } }))).toBeNull();
    expect(parseEnvelope(JSON.stringify({ ...withPreview, preview: { url: "https://x.test", title: "" } }))).toBeNull();
  });
});
