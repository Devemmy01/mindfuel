/**
 * Messages written while offline or that failed to send. Each entry keeps the
 * already-encrypted payload (so resending never re-runs crypto) plus the text
 * for display, like the existing local chat cache. Flushed in order on
 * reconnect; the server's clientMessageId check makes every retry idempotent.
 */
export type OutboxEntry = {
  clientMessageId: string;
  conversationId: string;
  payload: { ciphertext: string; iv: string; encryptionVersion: number };
  replyTo?: string;
  text: string;
  createdAt: string;
};

const PREFIX = "mindfuel:chat-outbox:v1:";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function key(uid: string) {
  return `${PREFIX}${uid}`;
}

export function readOutbox(uid: string): OutboxEntry[] {
  try {
    const entries = JSON.parse(localStorage.getItem(key(uid)) || "[]") as OutboxEntry[];
    const fresh = entries.filter((entry) => Date.now() - new Date(entry.createdAt).getTime() < MAX_AGE_MS);
    return fresh.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } catch {
    return [];
  }
}

function write(uid: string, entries: OutboxEntry[]) {
  try {
    if (entries.length) localStorage.setItem(key(uid), JSON.stringify(entries));
    else localStorage.removeItem(key(uid));
  } catch {
    // Without storage the entry survives only until reload.
  }
}

export function addToOutbox(uid: string, entry: OutboxEntry) {
  write(uid, [...readOutbox(uid).filter((item) => item.clientMessageId !== entry.clientMessageId), entry]);
}

export function removeFromOutbox(uid: string, clientMessageId: string) {
  write(uid, readOutbox(uid).filter((item) => item.clientMessageId !== clientMessageId));
}

export function clearOutbox(uid: string) {
  write(uid, []);
}
