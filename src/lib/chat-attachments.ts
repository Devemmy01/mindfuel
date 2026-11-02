/**
 * Encrypted photo messages. The photo is re-encoded in the browser (which
 * drops EXIF, including location), encrypted with the conversation key, and
 * uploaded as opaque bytes. The message itself carries an encrypted envelope
 * pointing at it, so the server can't tell a photo message from a text one.
 * See docs/proposals/chat-image-attachments.md.
 */

export const IMAGE_MAX_SIDE = 2048;
/** Encoded image budget; ciphertext adds 16 bytes and must stay under the 4 MB upload limit. */
export const IMAGE_MAX_BYTES = 3_000_000;
export const ATTACHMENT_MAX_UPLOAD_BYTES = 4_000_000;
/** Messages whose decrypted text is an envelope. Text-only messages stay version 1. */
export const ENVELOPE_ENCRYPTION_VERSION = 2;

export type ImageEnvelope = {
  t: "image";
  /** Attachment id from POST /api/chat/attachments. */
  id: string;
  /** Base64 AES-GCM IV for the attachment bytes. */
  iv: string;
  w: number;
  h: number;
  mime: string;
  caption?: string;
};

export function serializeEnvelope(envelope: ImageEnvelope) {
  return JSON.stringify(envelope);
}

/** The envelope inside a decrypted message, or null for ordinary text. */
export function parseEnvelope(text: string | null | undefined): ImageEnvelope | null {
  if (!text || text[0] !== "{") return null;
  try {
    const value = JSON.parse(text) as Partial<ImageEnvelope>;
    if (
      value?.t === "image" &&
      typeof value.id === "string" && /^[a-f0-9]{24}$/.test(value.id) &&
      typeof value.iv === "string" && value.iv.length <= 64 &&
      Number.isFinite(value.w) && Number.isFinite(value.h) &&
      typeof value.mime === "string" && /^image\/(jpeg|webp|png)$/.test(value.mime)
    ) {
      return {
        t: "image",
        id: value.id,
        iv: value.iv,
        w: Math.max(1, Math.round(value.w as number)),
        h: Math.max(1, Math.round(value.h as number)),
        mime: value.mime,
        caption: typeof value.caption === "string" && value.caption.trim() ? value.caption.slice(0, 2000) : undefined,
      };
    }
  } catch {
    // Not an envelope.
  }
  return null;
}

/** What to show where a one-line preview of a message is needed. */
export function messagePreviewText(text: string | null | undefined) {
  const envelope = parseEnvelope(text);
  if (!envelope) return text || "";
  return envelope.caption ? `📷 ${envelope.caption}` : "📷 Photo";
}

/** Scale (w, h) to fit inside a max × max box, never upscaling. */
export function fitWithin(width: number, height: number, max = IMAGE_MAX_SIDE) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/**
 * Downscale and re-encode a picked image as JPEG within the size budget.
 * Re-encoding through a canvas drops all metadata.
 */
export async function prepareImage(file: File): Promise<{ blob: Blob; width: number; height: number; mime: string }> {
  if (!file.type.startsWith("image/")) throw new Error("That file isn't an image.");
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    let { width, height } = fitWithin(bitmap.width, bitmap.height);
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("This browser can't prepare photos.");
      context.drawImage(bitmap, 0, 0, width, height);
      const quality = Math.max(0.5, 0.85 - attempt * 0.07);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (blob && blob.size <= IMAGE_MAX_BYTES) return { blob, width, height, mime: "image/jpeg" };
      ({ width, height } = fitWithin(width, height, Math.round(Math.max(width, height) * 0.8)));
    }
    throw new Error("That photo is too large to send.");
  } finally {
    bitmap.close();
  }
}
