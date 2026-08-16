import { createDecipheriv, pbkdf2Sync } from "node:crypto";
import { normalizeRecoveryPin } from "@/lib/chat-recovery-shared";

type StoredRecoveryBackup = {
  ciphertext: string;
  iv: string;
  salt: string;
  iterations: number;
};

type RecoveredIdentity = { privateKey: JsonWebKey; publicKey: string };

// Server-side counterpart to chat-crypto.ts's client-side AES-GCM encrypt.
// Decrypting here (instead of handing the ciphertext to the client) is what
// makes the failed-attempt lockout in the restore route meaningful — a
// client-side decrypt would let an attacker who fetches the blob once brute
// force the PIN offline with no further server involvement, since a 6-digit
// PIN only has a million possibilities.
export function decryptRecoveryBackup(pin: string, backup: StoredRecoveryBackup): RecoveredIdentity | null {
  const normalized = normalizeRecoveryPin(pin);
  if (!normalized) return null;

  let raw: Buffer;
  let salt: Buffer;
  let iv: Buffer;
  try {
    raw = Buffer.from(backup.ciphertext, "base64");
    salt = Buffer.from(backup.salt, "base64");
    iv = Buffer.from(backup.iv, "base64");
  } catch {
    return null;
  }
  if (raw.length <= 16) return null;
  const tag = raw.subarray(raw.length - 16);
  const encrypted = raw.subarray(0, raw.length - 16);

  const key = pbkdf2Sync(normalized, salt, backup.iterations, 32, "sha256");

  let plaintext: Buffer;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  } catch {
    return null;
  }

  try {
    const identity = JSON.parse(plaintext.toString("utf8")) as Partial<RecoveredIdentity>;
    if (!identity.privateKey || typeof identity.publicKey !== "string") return null;
    return { privateKey: identity.privateKey, publicKey: identity.publicKey };
  } catch {
    return null;
  }
}
