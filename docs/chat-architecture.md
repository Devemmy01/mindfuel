# Chat architecture

## Realtime topology

**Decision (2026-11-02): stay on Vercel.** Vercel Functions serve WebSockets on all plans. In a Next.js project that has to happen inside an App Router route via `upgradeWebSocket()` from `@vercel/functions`; a root `api/` server is never routed. That was why the old `api/socket.ts` returned the Next.js 500 page.

| Piece | Where it runs | Notes |
|---|---|---|
| `src/lib/realtime/hub.ts` | Both | Auth, rooms, presence, typing, read receipts, reactions and message relay. JSON frames `{ e, d }`. The first frame must be `auth` with a Firebase ID token, or the socket closes with `4401` after 10s. 15s ping; dead sockets are dropped. |
| `app/api/socket/route.ts` | Vercel | `upgradeWebSocket()` hands the socket to the hub. `maxDuration` 300s, after which the client reconnects. |
| `server.ts` | `npm run dev` / `npm start` | Routes `/api/socket` upgrades to the same hub; other upgrades (dev hot reload) go to Next. |
| Redis (`REDIS_URL`) | Optional | Pub/sub between instances plus presence counters with a 60s TTL. **The current Upstash host no longer resolves**, so delivery is per instance: two people on different instances miss live typing and presence, but messages still arrive through polling. Add Redis from the Vercel Marketplace and set `REDIS_URL` to restore cross-instance delivery. |
| `src/lib/socket.ts` | Browser | Same `on`/`off`/`emit` API the components already used, on a native WebSocket (no socket.io-client in the bundle). Emits queue while disconnected (up to 50). Unlimited reconnect, 1s to 30s backoff with jitter, immediate retry on `online` and on returning to the foreground. |

Requires Fluid compute (on by default for projects created after April 2025; otherwise **Settings → Functions**). After a deploy, existing connections stay on the old deployment until they close.

Messages never depend on the socket: REST is the durable path, the thread still polls, and the outbox flushes on reconnect. Payloads are already encrypted before they reach the socket.

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

- **Block and mute (done in Phase 15):**
  - `Block` model, enforced in both directions on new conversations, messages, follows and notifications. Blocking removes follows both ways and the blocked person isn't told.
  - `Conversation.mutedBy` stops message pushes for one conversation; messages still arrive in the app.
  - Controls are in the thread menu and the profile options sheet.
- **Image sending:** needs a crypto change. See `docs/proposals/chat-image-attachments.md` (awaiting sign-off).
- **Message requests, swipe actions, delete-for-me, link previews:** not done. Message requests need a decision on who may message whom (followers only? anyone with a request inbox?) before a data model. Report reuses `app/api/reports` for posts only.
- **Read-receipt and presence privacy settings:** need a reciprocity design and socket changes. 
- **Restyling the Messages screens:** `MessagesClient.tsx` (about 2,000 lines) should first be split into list, thread and composer components. That's a refactor best reviewed on its own.
- **No change** to `chat-crypto.ts`, key storage, device linking or recovery.
