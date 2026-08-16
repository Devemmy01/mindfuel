const PRIVATE_KEY_PREFIX = "mindfuel:e2ee:private:v1:";

export class ChatKeyMismatchError extends Error {
  constructor() {
    super("This browser is not linked to this encrypted conversation");
    this.name = "ChatKeyMismatchError";
  }
}

export function isChatKeyMismatchError(error: unknown) {
  return error instanceof ChatKeyMismatchError;
}

function bytesToBase64(bytes: ArrayBuffer | Uint8Array) {
  const value = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export async function ensureChatIdentity(uid: string) {
  const storageKey = `${PRIVATE_KEY_PREFIX}${uid}`;
  const stored = localStorage.getItem(storageKey);
  if (stored) {
    const parsed = JSON.parse(stored) as { privateKey: JsonWebKey; publicKey: string };
    return parsed;
  }
  const pair = await crypto.subtle.generateKey(
    { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["encrypt", "decrypt"],
  );
  const [privateKey, publicKey] = await Promise.all([
    crypto.subtle.exportKey("jwk", pair.privateKey),
    crypto.subtle.exportKey("spki", pair.publicKey),
  ]);
  const identity = { privateKey, publicKey: bytesToBase64(publicKey) };
  localStorage.setItem(storageKey, JSON.stringify(identity));
  return identity;
}

async function importPublicKey(value: string) {
  return crypto.subtle.importKey("spki", base64ToBytes(value), { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]);
}

async function importPrivateKey(value: JsonWebKey) {
  return crypto.subtle.importKey("jwk", value, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["decrypt"]);
}

export async function createConversationKey(publicKeys: Array<{ userId: string; publicKey: string }>) {
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const raw = await crypto.subtle.exportKey("raw", key);
  const wrappedKeys = await Promise.all(publicKeys.map(async ({ userId, publicKey }) => ({
    userId,
    wrappedKey: bytesToBase64(await crypto.subtle.encrypt({ name: "RSA-OAEP" }, await importPublicKey(publicKey), raw)),
  })));
  return { key, wrappedKeys };
}

export async function unwrapConversationKey(uid: string, wrappedKey: string) {
  const identity = await ensureChatIdentity(uid);
  try {
    const raw = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, await importPrivateKey(identity.privateKey), base64ToBytes(wrappedKey));
    return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
  } catch {
    // Browsers expose this as an opaque OperationError. In this flow it means
    // the wrapped conversation key belongs to a different device identity.
    throw new ChatKeyMismatchError();
  }
}

export async function encryptChatText(key: CryptoKey, text: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(text));
  return { ciphertext: bytesToBase64(ciphertext), iv: bytesToBase64(iv), encryptionVersion: 1 };
}

export async function decryptChatText(key: CryptoKey, ciphertext: string, iv: string) {
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(iv) }, key, base64ToBytes(ciphertext));
  return new TextDecoder().decode(plaintext);
}

export type EncryptedChatIdentity = {
  ciphertext: string;
  iv: string;
  wrappedKey: string;
};

export async function chatKeyVerification(publicKey: string) {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(publicKey)),
  );
  const value = new DataView(digest.buffer).getUint32(0) % 1_000_000;
  return String(value).padStart(6, "0");
}

export async function encryptChatIdentityForDevice(
  uid: string,
  targetPublicKey: string,
): Promise<EncryptedChatIdentity> {
  const identity = await ensureChatIdentity(uid);
  const transferKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
  const rawTransferKey = await crypto.subtle.exportKey("raw", transferKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    transferKey,
    new TextEncoder().encode(JSON.stringify(identity)),
  );
  const wrappedKey = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    await importPublicKey(targetPublicKey),
    rawTransferKey,
  );
  return {
    ciphertext: bytesToBase64(ciphertext),
    iv: bytesToBase64(iv),
    wrappedKey: bytesToBase64(wrappedKey),
  };
}

export async function installLinkedChatIdentity(
  uid: string,
  encryptedIdentity: EncryptedChatIdentity,
) {
  const temporaryIdentity = await ensureChatIdentity(uid);
  const rawTransferKey = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    await importPrivateKey(temporaryIdentity.privateKey),
    base64ToBytes(encryptedIdentity.wrappedKey),
  );
  const transferKey = await crypto.subtle.importKey(
    "raw",
    rawTransferKey,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(encryptedIdentity.iv) },
    transferKey,
    base64ToBytes(encryptedIdentity.ciphertext),
  );
  const identity = JSON.parse(new TextDecoder().decode(plaintext)) as {
    privateKey?: JsonWebKey;
    publicKey?: string;
  };
  if (!identity.privateKey || typeof identity.publicKey !== "string") {
    throw new Error("The linked chat identity is invalid");
  }
  const testValue = crypto.getRandomValues(new Uint8Array(32));
  const encryptedTest = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    await importPublicKey(identity.publicKey),
    testValue,
  );
  const decryptedTest = new Uint8Array(
    await crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      await importPrivateKey(identity.privateKey),
      encryptedTest,
    ),
  );
  if (decryptedTest.some((byte, index) => byte !== testValue[index])) {
    throw new Error("The linked chat identity could not be verified");
  }
  localStorage.setItem(
    `${PRIVATE_KEY_PREFIX}${uid}`,
    JSON.stringify({ privateKey: identity.privateKey, publicKey: identity.publicKey }),
  );
  return { privateKey: identity.privateKey, publicKey: identity.publicKey };
}

// --- Recovery PIN backup ---------------------------------------------------
// Lets a user restore their chat identity on a brand-new device without any
// other device online, by encrypting a copy of their private key with a key
// derived from a PIN only they know. Setup stays entirely client-side (the
// server only ever stores the ciphertext + KDF params — never the PIN or the
// plaintext key), but unlike the old high-entropy recovery code, a short PIN
// is brute-forceable offline in a fraction of a second, so it can't be
// decrypted client-side. Restoring instead goes through
// POST /api/chat/recovery/restore, which decrypts server-side and enforces a
// failed-attempt lockout — see chat-recovery-server.ts. If the user loses
// the device *and* forgets the PIN *and* has no other linked device, the
// messages are gone; there's no way around that without giving the server
// (or us) a way to read chats.

import { RECOVERY_ITERATIONS, normalizeRecoveryPin } from "@/lib/chat-recovery-shared";

export type RecoveryBackup = {
  ciphertext: string;
  iv: string;
  salt: string;
  iterations: number;
};

async function deriveRecoveryKey(pin: string, salt: Uint8Array, iterations: number) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(normalizeRecoveryPin(pin)),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );
}

/** Encrypts this device's identity with a key derived from a user-chosen PIN. */
export async function createRecoveryBackup(uid: string, pin: string): Promise<RecoveryBackup> {
  const identity = await ensureChatIdentity(uid);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveRecoveryKey(pin, salt, RECOVERY_ITERATIONS);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(identity)),
  );
  return {
    ciphertext: bytesToBase64(ciphertext),
    iv: bytesToBase64(iv),
    salt: bytesToBase64(salt),
    iterations: RECOVERY_ITERATIONS,
  };
}

/** Stores an identity the server already decrypted (via /api/chat/recovery/restore) on this device. */
export function storeRecoveredIdentity(uid: string, identity: { privateKey: JsonWebKey; publicKey: string }) {
  localStorage.setItem(
    `${PRIVATE_KEY_PREFIX}${uid}`,
    JSON.stringify({ privateKey: identity.privateKey, publicKey: identity.publicKey }),
  );
}
