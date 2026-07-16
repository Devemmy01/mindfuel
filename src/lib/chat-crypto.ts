const PRIVATE_KEY_PREFIX = "mindfuel:e2ee:private:v1:";

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
  const raw = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, await importPrivateKey(identity.privateKey), base64ToBytes(wrappedKey));
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
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
