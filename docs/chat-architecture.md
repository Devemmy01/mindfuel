# Chat architecture

## Realtime topology (as found, 2026-11-02)

| Piece | Where it runs | Status |
|---|---|---|
| `server.ts` (Next.js plus Socket.IO on one Node server) | `npm run dev` / `npm start` only | Works locally. **Never runs on Vercel**, which serves Next.js as serverless functions. |
| `api/socket.ts` (Socket.IO on a Vercel Function, relying on Vercel's WebSocket support) | Vercel | **Not working in production.** `GET https://www.mind-fuel.app/api/socket?EIO=4&transport=polling` and the WebSocket upgrade both return the Next.js 500 page. |
| Redis adapter (`@socket.io/redis-adapter`, `ioredis`) | Enabled when `REDIS_URL` is set | The Upstash host in `.env.local` no longer resolves (`ENOTFOUND`). Even when it works, rooms on short-lived serverless instances are unreliable. |
| Client (`src/lib/socket.ts`) | Browser | Connects to `NEXT_PUBLIC_SOCKET_URL` or the same origin at `/api/socket`, authenticating with the Firebase ID token. |

**Consequence:** in production, chat runs entirely on HTTP: a 6s message poll on the open thread, a 4s typing poll, SWR revalidation on focus and reconnect, and push notifications. Live presence, typing over the socket and instant read receipts are effectively off.

**Recommendation.** The owner decides; the code works either way.
1. **Preferred if you want presence and typing:** run `server.ts` (or a socket-only variant of `configureSocketServer`) on an always-on host (Fly.io, Railway or Render) with a working Redis.
   - Set `NEXT_PUBLIC_SOCKET_URL` to that host.
   - The CSP in `middleware.ts` already adds `NEXT_PUBLIC_SOCKET_URL` to `connect-src`.
2. **Without a socket host:** keep HTTP and replace the full-window poll with the `after` cursor below, plus Server-Sent Events, for cheaper, faster updates.

## Message send path

1. The client encrypts the text: AES-GCM with the conversation key, wrapped per participant with RSA-OAEP. This is unchanged (`src/lib/chat-crypto.ts`).
2. The encrypted payload is written to the **outbox** (`src/lib/chat-outbox.ts`, `localStorage`, per user) with a `clientMessageId` (UUID). It renders immediately as "sending".
3. `POST /api/chat/messages` with `{ conversationId, ciphertext, iv, encryptionVersion, replyTo, clientMessageId }`. This is the **durable write**.
   - **Idempotent:** a partial unique index on `{ sender, clientMessageId }` means a retry returns the original (`200 { duplicate: true }`), and a concurrent duplicate (`E11000`) resolves to the winner.
   - **Rate-limited:** 30 messages per minute per sender (429).
4. On success the entry leaves the outbox, the thread shows the server copy, and the client emits `message:published` (when a socket is up) so the server relays it to recipients' `user:<uid>` rooms.
5. On failure the entry stays in the outbox as **"Not sent · Retry"**, using the same `clientMessageId`.
   - Offline: "You're offline. This message will send when you're back."
   - The outbox flushes **oldest first, stopping at the first failure** (so order is preserved) on mount, `online`, `visibilitychange → visible`, and socket `connect`.
6. The recipient push is sent from step 3 (server side) and never contains text (see below).

## Resync

- `GET /api/chat/messages?conversationId=…&after=<ISO time>` returns only messages newer than the given time. This is the server half of cursor resync.
- The client currently still revalidates the full recent window (last 200) on reconnect, focus and `online`, and polls every 6s while a thread is open.
  - Switching the client to `after` deltas requires merging encrypted rows through the decrypt path in `MessagesClient`. That's left for the Messages refactor, so the decrypt logic changes in one reviewed place.
- Socket reconnect: unlimited attempts, exponential backoff from 1s to 30s with 50% jitter. On `connect` the client rejoins the room, refetches and flushes the outbox.
- The thread header shows "Reconnecting…" only when the message fetch actually fails, and "You're offline…" when the browser is offline. A down socket alone shows nothing, because polling still delivers.

## What is and isn't end-to-end encrypted

| Encrypted (server stores ciphertext only) | Not encrypted (server can see) |
|---|---|
| Message text | Who talks to whom (participants), timestamps, message count |
| | Sender of each message, read receipts (`readBy`), reactions (emoji and who) |
| | Reply relationships (`replyTo` ids). Legacy pre-encryption messages have a plaintext `text` field. |
| | Device public keys; recovery data is encrypted with a key derived from the PIN, with a server-enforced lockout |

**Local storage:** the chat cache (`mindfuel:chat:v1:*`) and the outbox (`mindfuel:chat-outbox:v1:*`) keep decrypted text on the device, as the app did before this change. Clearing site data removes them. Anyone with access to the unlocked device and browser profile can read them.

## Push payload policy for messages

- The title is "New message from <first name>", the body is "Open MindFuel to read it", and the link is `/messages?with=<sender firebaseId>`.
- **Push payloads never contain message text.** Previews would need decryption on the device (in the service worker), which needs key access there. That isn't designed yet, so there's no preview option.
- Collapse tag `conversation-<id>`: repeats replace each other.
- Delivery follows the person's "Messages" push setting. Messages are exempt from quiet hours and the daily cap.

## Not done in this phase (and why)

- **Message requests, block and mute, swipe actions, image sending, delete-for-me and link previews:** these need new models and permissions; they're product work beyond reliability. Report reuses `app/api/reports` for posts only.
- **Read-receipt and presence privacy settings:** need a reciprocity design and socket changes. With the socket down in production they'd have no visible effect yet.
- **Restyling the Messages screens:** `MessagesClient.tsx` (about 2,000 lines) should first be split into list, thread and composer components. That's a refactor best reviewed on its own.
- **No change** to `chat-crypto.ts`, key storage, device linking or recovery.
