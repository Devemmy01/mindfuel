# Proposal: encrypted image attachments in chat

Status: **proposal, not implemented.** The brief requires a written proposal and tests before any change to crypto, key storage or recovery. This needs your sign-off.

## Today
- Each conversation has an AES-GCM-256 key, wrapped per participant with RSA-OAEP-2048 (`src/lib/chat-crypto.ts`).
- Text is encrypted in the browser (`encryptChatText`, random 96-bit IV). The server stores only `ciphertext` and `iv` (`encryptionVersion: 1`).

## Design
1. **In the browser:** downscale to at most 2048 px on the long side, re-encode as JPEG or WebP, and strip EXIF data (location). Cap the result at 5 MB.
2. **Encrypt the bytes** with the existing conversation key: AES-GCM with a fresh IV per file. Nothing new is added to key storage, linking or recovery: anyone who can read the conversation's text can read its images, and no one else can.
3. **Upload ciphertext only:**
   - `POST /api/chat/attachments` returns a short-lived signed upload URL for a private object (Vercel Blob or Cloudinary "authenticated" type).
   - The server never sees plaintext. It records `{ conversation, uploader, size, objectKey }` and checks the uploader is a participant, there is no block, and the rate limit allows it.
4. **The message carries a reference** in its encrypted payload: a JSON envelope `{ "t": "image", "key": "<objectKey>", "iv": "...", "w": 1024, "h": 768, "blurhash": "..." }`, encrypted like text. The server can't tell an image message from a text message. That uses `encryptionVersion: 2`; v1 clients render "Update MindFuel to see this photo".
5. **Download:** `GET /api/chat/attachments/:id` checks participation and returns a short-lived signed URL. The browser decrypts into a `blob:` URL and caches it in memory only, never in `localStorage`.
6. **Deletion:** deleting the message deletes the object. Orphaned uploads (never attached within 24 hours) are swept by a cron.

## Why not just upload images to Cloudinary?
Cloudinary would hold readable photos of private conversations. That breaks the end-to-end guarantee the chat makes today.

## Tests needed before shipping
- Encrypt/decrypt round trip, and a tampered IV or ciphertext fails (GCM auth).
- A non-participant gets 403 on upload and download; a blocked pair gets 403.
- A v1 client sees the fallback text, never ciphertext.
- EXIF is gone after processing; the size cap is enforced in the browser and on the server.

## Open questions for you
1. Storage: Vercel Blob (simplest on this stack) or Cloudinary (already used for avatars)?
2. Is 5 MB and 2048 px right for your users' networks?
3. Should pushes for image messages say "sent a photo"? That reveals the type, though not the content.
