# MindFuel

**A personal growth network where people grow together through reflection** — a journal, a calm social feed, and a habit builder, combined into one product, with genuinely end-to-end encrypted private messaging underneath it.

```text
https://mind-fuel.app
```

![Next.js](https://img.shields.io/badge/Next.js_15-000000?style=flat&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React_19-149ECA?style=flat&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=flat&logo=socket.io&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase_Auth-FFCA28?style=flat&logo=firebase&logoColor=black)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=flat&logo=vitest&logoColor=white)

In simple terms: **MindFuel turns individual reflection into shared growth** — and takes the unusual step of making sure that, for private conversations, not even MindFuel's own servers can read them.

---

## At a Glance

| | |
| --- | --- |
| **What it is** | Full-stack social journaling app — reflection feed, prompts, streaks, private messaging, notifications, PWA |
| **Who it's for** | People who want a calmer, growth-oriented alternative to attention-driven social platforms |
| **Standout engineering** | A real end-to-end encrypted chat system (RSA-OAEP + AES-GCM, multi-device linking, PIN-based account recovery with a server-enforced brute-force lockout) built from scratch on top of Web Crypto |
| **Scale pattern** | Next.js App Router serving both frontend and API, MongoDB for durable state, Socket.IO + Redis adapter for realtime fan-out across instances |
| **Also included** | Firebase auth, Cloudinary media, Resend email, web push, PWA install flow, Vercel cron jobs, Vitest test suite, GitHub Actions CI |

If you're reviewing this repo quickly: the [End-to-End Encryption](#end-to-end-encryption) section below is the part most worth reading closely — it's a from-scratch cryptographic design (not a wrapper around a vendor SDK), including a deliberate architectural decision to move PIN-based account recovery from the client to the server specifically so a short PIN's brute-force protection is real rather than cosmetic.

---

## Why MindFuel Exists

Most social platforms are built around attention. They reward speed, reaction, and constant consumption. MindFuel is built around reflection. It gives users a place to slow down, write honestly, learn from others, and track how their thinking evolves over time.

The core idea is that small daily reflections can become a powerful archive of growth. A single post might be a thought, a lesson, a quote, a personal insight, or an answer to a prompt. Over weeks and months, those posts become a journal, a profile, and a visible journey.

## Product Summary

MindFuel combines three familiar ideas:

- **A journal**, because users can write personal reflections and revisit their growth.
- **A social feed**, because users can read, like, comment, repost, quote, and save reflections from others.
- **A habit builder**, because daily prompts, streaks, milestones, emails, and push notifications encourage consistency.

The result is a mindful community product where content is not just entertainment. It is a record of what people are learning.

## Who It Is For

MindFuel is designed for:

- Students documenting lessons and self-discovery.
- Developers, designers, founders, and creators reflecting on their work and growth.
- Professionals who want a calmer alternative to traditional social media.
- Lifelong learners who enjoy thoughtful prompts and meaningful conversations.
- Anyone who wants to build a habit of reflection without using a private journal alone.

---

## Core Features

### Reflection Feed

Users can browse a feed of reflections from the community. Posts support engagement features such as likes, comments, saves, reposts, quoted posts, view tracking, hashtags, and profile links.

### Daily Reflection Prompts

MindFuel includes a rotating prompt system with curated questions across categories such as gratitude, growth, mindfulness, reflection, and challenge. Prompts give users a starting point when they want to write but do not know what to say.

Example prompt themes:

- What are you grateful for today?
- What lesson did today teach you?
- What belief are you ready to release?
- What would your future self thank you for?

### Reflection Creation

The post creation flow lets users publish reflections with styling options such as backgrounds, fonts, images, prompt context, polls, hashtags, and quoted reflections. This makes writing feel expressive while keeping the product centered on thoughtfulness.

### Profiles

Each user has a profile that shows identity, username, bio, avatar, reflection history, earned milestones, followers, and following. People can follow, unfollow, follow back, browse connection lists, and start a private conversation from a profile.

### Followers and Connections

MindFuel includes a two-way connection layer built around follower and following relationships. Follow state updates optimistically across profile and notification surfaces, duplicate relationships are prevented at the database level, and new followers generate in-app alerts plus push notifications when the recipient has enabled them.

### Private Messaging — End-to-End Encrypted

Members can start one-to-one conversations from profiles or the messages screen. Every message is encrypted client-side before it leaves the device; MindFuel's servers and database only ever see ciphertext. See [End-to-End Encryption](#end-to-end-encryption) below for the full design. On top of that cryptographic layer, chat includes:

- Real-time message delivery through Socket.IO, with a Redis adapter so delivery works correctly across multiple server instances.
- MongoDB-backed conversation history and unread counts (stored as ciphertext).
- Optimistic sends with sending and failure states.
- Typing indicators and conversation presence rooms.
- Delivered and seen receipts, shown as gray → green double-checkmarks in both the open conversation and the conversation list.
- Multi-device linking via a short-code handshake, so a second device can join existing encrypted conversations without ever exposing the private key to the server.
- PIN-based account recovery with a real, server-enforced attempt lockout.
- Emoji insertion and a responsive, auto-growing composer.
- Conversation search, cached history, and reconnect recovery.
- Live message badges and green unread states across navigation and conversation lists.
- In-app toasts while using MindFuel, browser alerts for hidden tabs, and web push when the recipient is offline.

### Saves and Collections

Users can save reflections that resonate with them. The collections area acts like a personal library of meaningful thoughts, lessons, and ideas found across the platform.

### Comments and Replies

MindFuel supports conversation around reflections through comments, nested replies, comment likes, and notification flows. The goal is discussion with context, not disconnected reactions.

### Reposts and Quote Posts

Users can reshare reflections or quote them with their own thoughts. This makes it possible to build on another person's idea while preserving the original context.

### Hashtags and Discovery

Hashtags make reflections discoverable by topic. The app includes hashtag pages, hashtag search, trending hashtags, and hashtag suggestions.

### Milestones and Streaks

MindFuel includes habit and achievement mechanics:

- First reflection badge.
- Reflection streak milestones.
- Total post milestones.
- Early morning and late night reflection badges.
- Historical milestone backfilling for users who qualified before milestone tracking existed.

These features turn reflection into a visible habit without making the app feel like a game first.

### Notifications

MindFuel supports multiple notification channels:

- In-app notifications for likes, comments, replies, reposts, quotes, saves, and new followers.
- Immediate chat toasts and unread message badges.
- Web push notifications through VAPID and service workers.
- Offline message pushes and new-follower push notifications.
- Email notifications through Resend.
- Daily prompt and daily fuel reminder flows.

### Progressive Web App

MindFuel is configured as a PWA using `next-pwa`. It includes service worker support, offline handling, installable app behavior, web push subscription management, icons, and a manifest.

### Email System

The app uses React Email and Resend for branded emails, including daily tips, comment notifications, quote notifications, repost notifications, updates, reminders, welcome-style messaging, and a one-time nudge to set up encrypted-chat recovery.

### Admin and Cron Workflows

The backend includes cron and admin routes for recurring product operations:

- Daily tip delivery.
- Daily prompt push notifications.
- Inactivity reminders.
- Tip synchronization.
- Chat recovery reminder emails, sent once to accounts with encrypted conversations and no recovery PIN on file.
- Admin update broadcasts.

---

## End-to-End Encryption

This is the part of MindFuel most worth a closer read if you're evaluating the engineering. Private conversations are encrypted **client-side, before any network request is made**, using the browser's native [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) — no third-party crypto library, no server-side plaintext, ever. MongoDB stores ciphertext; the server's job is to relay and index encrypted blobs, not to read them.

### Identity and conversation keys

- On first use, each **device** generates its own RSA-OAEP 2048-bit keypair via `crypto.subtle.generateKey`. The private key never leaves the device — it's kept in `localStorage`, not sent to the server in any form. The public key is registered against the user's account.
- Each **conversation** gets its own random AES-256-GCM symmetric key, generated client-side the first time two people exchange an encrypted message. That key is wrapped (RSA-OAEP) separately for each participant's registered public key, and only the wrapped (still-encrypted) copies are stored server-side, in a `Conversation.encryptedKeys` array.
- Every message is `AES-GCM`-encrypted with the conversation's key before it's sent; the API and database only ever handle ciphertext, IV, and metadata.
- If a device's current identity can no longer unwrap a conversation's existing key (see recovery, below), the app transparently establishes a fresh shared key wrapped for everyone's *current* public key rather than permanently blocking new messages — a deliberate trade-off: the conversation keeps working going forward, but messages encrypted under the abandoned key stay unrecoverable by design.

### Linking a second device

Reading old conversations from a new device requires that device to possess the *same* private key as an already-trusted one — there is no server-side way to hand it over otherwise. Linking works as a short-lived, mutually-verified handshake between two browsers:

1. The trusted device requests a one-time link code from the server.
2. The new device enters that code and its own public key.
3. Both devices independently compute a short numeric verification code from the same public key material, so the person can visually confirm the two devices agree before anything is transferred (protection against a server-in-the-middle substituting a different public key).
4. Once approved, the trusted device encrypts its private key with a random transfer key, wraps *that* transfer key with the new device's RSA public key, and sends only the double-wrapped result through the server. The server relays ciphertext it cannot open.
5. The new device unwraps its way back to the original private key and verifies it round-trips correctly before installing it.

### Recovering a lost device — and why restoring is a server call, not a client decrypt

Losing every linked device is the one scenario a purely client-side design can't fix on its own, so MindFuel supports an optional recovery PIN — conceptually similar to WhatsApp or Signal's PIN-based backup, and built for the same reason those products don't just let you type a passphrase into a client-side decrypt:

- **Setup** stays entirely client-side: the device encrypts a copy of its identity with a key derived from a user-chosen PIN (PBKDF2-SHA256, 210,000 iterations) via AES-256-GCM, and uploads only the ciphertext. The server never sees the PIN or the plaintext key.
- **Restoring** is different on purpose. A short, memorable PIN (6–10 digits) has a tiny keyspace compared to a random recovery code — brute-forceable offline in well under a second once an attacker has the ciphertext. Rate-limiting an API *endpoint* doesn't stop that, because the very first successful fetch already hands over everything needed to keep guessing with no further server contact. So decryption itself happens **server-side**, in `POST /api/chat/recovery/restore`, using Node's `crypto` module to mirror the exact PBKDF2/AES-GCM parameters the browser used. The server reserves a failed-attempt slot atomically before each decrypt attempt and locks the backup out after 5 wrong PINs, which is only meaningful because the ciphertext never leaves the server to be brute-forced independently.
- The WebCrypto (browser) ↔ Node `crypto` (server) interop is exercised end-to-end — encrypting with `crypto.subtle` and decrypting with Node's `crypto` module round-trips correctly, including a wrong-PIN case that fails closed instead of throwing.
- If neither a linked device nor the PIN is available, a user can explicitly start fresh — this permanently gives up that device's access to prior encrypted history in exchange for a working identity going forward, and is always an informed, two-step confirmation rather than a silent reset.

### Threat model, plainly stated

MindFuel's own servers and database operators cannot read message content, cannot read the identity or conversation keys, and cannot recover a lost device without either a still-linked device or the user's own PIN. The trade-off is symmetric: if a user loses every device *and* their PIN, MindFuel cannot get those messages back either — there is no backdoor to remove.

---

## Feature Map

| Area | What It Does |
| --- | --- |
| Landing page | Explains MindFuel and routes authenticated users into the app |
| Feed | Community reflection discovery and engagement |
| Create | Reflection composer with prompts, styling, media, hashtags, polls, and quotes |
| Profile | User identity, bio, posts, milestones, and growth history |
| Connections | Followers, following, follow-back actions, and connection discovery |
| Messages | End-to-end encrypted real-time chat, device linking, PIN recovery, unread states, typing indicators, emoji, and seen receipts |
| Collections | Saved reflections and personal idea library |
| Search | User and content discovery |
| Hashtags | Topic-based reflection browsing |
| Notifications | In-app, push, and email-based updates |
| Offline page | PWA fallback experience |
| Cron jobs | Automated daily reminders, tips, recovery nudges, and maintenance |

## Tech Stack

### Frontend

- **Next.js 15** with the App Router.
- **React 19** for component architecture.
- **TypeScript** for safer application code.
- **Tailwind CSS 4** for styling.
- **Framer Motion** for interface animation.
- **Lucide React** for icons.
- **SWR** for client-side data fetching and caching.
- **Socket.IO Client** for live messaging, typing, and read-receipt events.
- **Web Crypto API** (`crypto.subtle`) for all client-side end-to-end encryption — no external crypto dependency.

### Backend

- **Next.js Route Handlers** for API endpoints.
- **MongoDB** as the database.
- **Mongoose** for schemas, models, validation, and queries.
- **Firebase Authentication** for sign-in and user identity.
- **Node's built-in `crypto` module** for server-mediated recovery-PIN decryption (PBKDF2 + AES-256-GCM, matching the browser's Web Crypto output byte-for-byte).
- **Cloudinary** for image upload and media hosting.
- **Resend** for transactional and broadcast email.
- **web-push** for browser push notifications.
- **Socket.IO** for real-time conversation delivery.
- **Redis / ioredis** with the Socket.IO Redis adapter for multi-instance event delivery.

### PWA and Platform

- **next-pwa** for service worker generation and caching.
- **Custom service worker** for push notification handling.
- **Vercel cron jobs** for scheduled tasks.
- **Vercel Analytics** for analytics integration.

### Testing and CI

- **Vitest** for unit tests (`src/**/*.test.ts`), covering pure logic such as recovery-PIN validation, milestone calculation, streak math, hashtag parsing, and username handling.
- **GitHub Actions** runs lint and the full test suite on every push and pull request to `dev` and `main`.

## Architecture Overview

MindFuel uses the Next.js App Router as both the frontend and backend boundary, with an encryption layer that sits entirely on the client.

```text
User Browser
  |
  |-- React UI, PWA, Service Worker
  |-- Web Crypto: identity keys, conversation keys, message encrypt/decrypt
  |   (private keys never leave the device)
  |
Next.js App Router
  |
  |-- Pages: feed, create, profile, messages, search, collections, hashtags
  |-- API Routes: posts, comments, follows, chat, saves, users, notifications, push, cron
  |-- Socket.IO: conversations, typing, message delivery, and seen receipts
  |-- Recovery decrypt (Node crypto, server-side only, rate-limited)
  |
Data and Services
  |
  |-- MongoDB + Mongoose (durable posts, follows, conversations, ciphertext messages)
  |-- Redis adapter (cross-instance transient socket events)
  |-- Firebase Auth
  |-- Cloudinary
  |-- Resend
  |-- Web Push / VAPID
```

The frontend talks to internal API routes. API routes connect to MongoDB, validate user-related data, call third-party services when needed, and return JSON responses to the client. For encrypted chat, the API routes and database only ever handle ciphertext and wrapped keys — the one intentional exception is the recovery-restore endpoint, which briefly holds a decrypted identity in server memory for the duration of a single request, in exchange for being able to enforce a real PIN attempt lockout.

## Important Directories

```text
app/
  Next.js pages, layouts, API routes (including app/api/chat/* for messaging,
  device linking, and recovery), cron routes, and metadata routes.

src/components/
  Reusable UI and product components such as Navbar, PostCard, CardCreator,
  NotificationsList, ProfilePictureEditor, MessagesClient, and the chat/
  subfolder (ChatDeviceLinkModal, ChatRecoveryModal).

src/models/
  Mongoose schemas for users, posts, comments, likes, saves, reports,
  notifications, follows, conversations, messages, collections, hashtags,
  reposts, and tips.

src/lib/
  Shared product logic and integrations: chat-crypto.ts (client-side Web
  Crypto), chat-recovery-shared.ts and chat-recovery-server.ts (the recovery
  PIN's isomorphic constants and server-side decrypt), notifications,
  milestones, prompts, push setup, SEO, and email service configuration.

src/hooks/
  Client hooks for push notifications, app badges, view tracking, and related UX.

src/emails/
  React Email templates for product emails.

worker/
  Custom service worker source used by next-pwa for push notifications.

public/
  Static assets, PWA icons, manifest, generated service worker files, and images.
```

## Data Model Overview

### User

Users are stored in MongoDB and linked to Firebase identity through `firebaseId`. A user includes profile information, notification preferences, push subscriptions, streak data, earned milestones, a registered chat public key, and an optional encrypted recovery backup.

Key fields:

- `email`, `name`, `username`, `image`, `bio`, `firebaseId`
- `preferences.dailyEmail`, `preferences.notifications`
- `pushSubscriptions`
- `streakDays`, `longestStreak`, `earnedMilestones`
- `chatPublicKey` — this device identity's registered RSA-OAEP public key
- `chatKeyRecovery` — `{ ciphertext, iv, salt, iterations, failedAttempts, lockedAt }`, the encrypted recovery backup and its attempt-lockout state; never selected by default, and never includes the PIN itself

### Post

Posts are the core reflection object. A post can be plain text, styled, image-backed, hashtagged, prompt-linked, quoted, reposted, or poll-enabled.

Key fields:

- `text`, `hashtags`, `userId`, `views`
- `likesCount`, `commentsCount`, `repostCount`
- `imageUrl`, `backgroundStyle`, `fontFamily`
- `promptId`, `poll`
- `quotedPostId`, `isRepost`, `repostedBy`

### Notifications

Notifications connect user actions to recipients. They support both in-app notification records and optional push/email delivery.

### Follows

Follow records connect a follower to the person they follow. A compound unique index prevents duplicate relationships, while reverse lookups support follower counts, following counts, follow-back state, and connection lists.

### Conversations and Messages

Conversations use a stable participant key so the same two people share one thread, plus `encryptionVersion` and `encryptedKeys` (one AES key wrapped per participant's current public key). Messages reference their conversation and sender, store `ciphertext`/`iv` instead of plaintext once encryption is established, keep a `readBy` list for seen receipts, and are indexed for chronological retrieval and unread aggregation.

### Comments, Likes, Saves, Reposts, Collections, Reports, Hashtags

These models support the social and moderation layer around reflections: conversation, engagement, bookmarking, resharing, organization, reporting, and topic discovery.

## API Overview

MindFuel uses route handlers under `app/api`.

| Route Area | Purpose |
| --- | --- |
| `/api/auth/sync` | Sync Firebase users into MongoDB |
| `/api/posts` | Create and fetch reflections |
| `/api/posts/feed` | Feed retrieval |
| `/api/posts/[id]` | Single post operations |
| `/api/posts/[id]/comments` | Comment creation and retrieval |
| `/api/posts/[id]/like` | Like and unlike posts |
| `/api/posts/[id]/repost` | Repost flows |
| `/api/posts/[id]/view` | View tracking |
| `/api/comments/[id]` | Comment operations |
| `/api/comments/[id]/like` | Comment likes |
| `/api/saves` | Save and unsave reflections |
| `/api/collections` | Saved reflection organization |
| `/api/follows` | Follow toggles, counts, relationship state, and connection lists |
| `/api/chat/conversations` | Conversation lookup, one-to-one thread creation, and establishing/re-establishing an encrypted conversation key |
| `/api/chat/messages` | Ciphertext message history, sending, and read-state updates |
| `/api/chat/keys` | Registers a device's public key; detects and reports device-identity conflicts |
| `/api/chat/link` | Device-linking handshake (create/request/confirm a link session) |
| `/api/chat/recovery` | Save an encrypted recovery backup; report whether one exists and whether it's locked (never returns the ciphertext) |
| `/api/chat/recovery/restore` | Server-side PIN decrypt with an atomic, enforced 5-attempt lockout |
| `/api/notifications` | In-app notification retrieval and updates |
| `/api/push/config` | Public VAPID key delivery |
| `/api/push/subscribe` | Browser push subscription persistence |
| `/api/users/profile` | Current user profile |
| `/api/users/[id]` | Public user profile data |
| `/api/users/search` | User search |
| `/api/hashtags/*` | Hashtag search, pages, and trends |
| `/api/upload` | Cloudinary upload handling |
| `/api/reports` | Report submission |
| `/api/cron/*` | Scheduled jobs, including the chat recovery reminder email |
| `/api/admin/broadcast` | Admin update emails |

## Push Notification Flow

1. The browser checks whether service workers and PushManager are supported.
2. The user grants notification permission.
3. The app registers `/sw.js` if needed.
4. The browser creates a push subscription using the public VAPID key.
5. The subscription is saved to the user's MongoDB record.
6. Server routes send push payloads through `web-push`.
7. The service worker receives the payload and displays the notification.
8. Clicking a notification opens the relevant MindFuel URL.

The custom worker also supports fallback handling for plain-text push payloads, so malformed test payloads do not crash notification display.

---

## Local Development

### Prerequisites

- Node.js 20 or newer recommended.
- npm.
- MongoDB connection string.
- Firebase project for authentication.
- Cloudinary account for uploads.
- Resend account for email features.
- VAPID key pair for push notifications.

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env.local` file in the project root.

```env
# App URLs
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Google Search Console (the content value from Google's HTML tag)
GOOGLE_SITE_VERIFICATION=...

# Database
MONGODB_URI=mongodb+srv://...

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Firebase Admin (server-side token verification)
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@....iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"

# Cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Email
RESEND_API_KEY=...

# Web Push
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_EMAIL=mailto:you@example.com

# Scheduled jobs and admin
CRON_SECRET=...
ADMIN_SECRET=...
```

### Run the Development Server

```bash
npm run dev
```

This boots Next.js and Socket.IO together via `server.ts`. Open:

```text
http://localhost:3000
```

### Build for Production

```bash
npm run build
```

### Start the Production Build

```bash
npm run start
```

### Lint

```bash
npm run lint
```

### Test

```bash
npm test        # single run
npm run test:watch
```

---

## Deployment Notes

MindFuel is optimized for deployment on Vercel.

Important deployment requirements:

- Add all required environment variables in the Vercel project settings.
- Configure the production app URL as `NEXT_PUBLIC_BASE_URL` and `NEXT_PUBLIC_APP_URL`.
- Add `GOOGLE_SITE_VERIFICATION` after creating the Search Console property, then redeploy and verify the HTML tag.
- Submit `https://mind-fuel.app/sitemap.xml` in Search Console after verification.
- Ensure MongoDB network access allows Vercel connections.
- Ensure Firebase Auth allows the production domain.
- Ensure Cloudinary credentials are present for uploads.
- Ensure Resend API key and verified sending domains are configured.
- Ensure VAPID keys are configured for push notifications.
- Vercel cron jobs are defined in `vercel.json`.

## Real-Time Chat Infrastructure

MindFuel uses Socket.IO on the same host as the web app. Locally, `npm run dev` boots Next.js and Socket.IO together through `server.ts`. On Vercel, the Socket.IO server is deployed as a WebSocket-capable Vercel Function, so no second application host or `NEXT_PUBLIC_SOCKET_URL` is required.

Because connected clients can land on different Vercel Function instances, add an Upstash Redis integration from the Vercel Marketplace and expose its connection string as `REDIS_URL`. Redis relays transient live events (typing, presence, delivery pings) between instances; MongoDB remains the durable source of truth for conversations and ciphertext messages. The HTTP API keeps chat history usable during socket reconnects.

Chat events are authorized against conversation membership before a socket can join a room or publish a message. Socket.IO carries immediate delivery, typing, and seen events over the wire — but since messages are already ciphertext by the time they reach the socket layer, a compromised relay still can't read them. Recipients with an active app connection receive realtime UI updates, hidden tabs can show browser notifications, and recipients with no live socket can receive web push on registered devices.

## PWA Behavior

The landing page includes an intentional install section and the signed-in app keeps an install action in the account/profile menus. Installed sessions always launch at `/feed`. The automatic in-app invitation waits until the third app visit and 45 seconds of engagement, appears at most once per browser session, and stays dismissed for 30 days. Dismissing it never removes the manual install actions.

## Vercel Cron Jobs

The project includes scheduled jobs, defined in `vercel.json`:

```json
[
  {
    "path": "/api/cron/daily-tip",
    "schedule": "0 5 * * *"
  },
  {
    "path": "/api/cron/inactivity-reminder",
    "schedule": "0 6 * * *"
  }
]
```

A separate cron route, `/api/cron/chat-recovery-reminder`, sends a one-time email nudge to accounts that have encrypted conversations but no recovery PIN saved yet — it's invoked on its own schedule and never repeats for a given account once sent.

---

## Security and Privacy Considerations

MindFuel handles user-generated content, profile data, authentication, emails, push subscriptions, and end-to-end encrypted messages. Important considerations include:

- Firebase manages authentication identity; every API route that touches user or chat data verifies a Firebase ID token server-side.
- Private message content, identity private keys, and conversation keys are never stored or transmitted in plaintext to or through MindFuel's servers — see [End-to-End Encryption](#end-to-end-encryption).
- The recovery-PIN restore flow is the one place server code briefly holds decrypted key material in memory, and only for the duration of a single authenticated request, in exchange for an attempt lockout that a purely client-side decrypt could never actually enforce.
- MongoDB stores user profile and product data; chat-related fields (`chatPublicKey`, `chatKeyRecovery`) are excluded from default query projections (`select: false`) and only returned where explicitly needed.
- Push subscriptions are stored per user and can become invalid over time.
- Cron and admin routes are protected by shared secrets.
- Uploads are handled through Cloudinary.
- User reports provide a moderation pathway.
- Privacy, terms, and cookie pages are present in the app.

## Technical Highlights

- Designed and implemented a from-scratch end-to-end encrypted messaging system on the Web Crypto API: per-device RSA-OAEP identities, per-conversation AES-GCM keys, a verified multi-device linking handshake, and PIN-based recovery with a server-enforced, atomically-reserved attempt lockout.
- Diagnosed and fixed a subtle React effect-cleanup bug by patching React's own dev-mode warning to print the exact fiber chain and offending effect source at runtime, rather than guessing from static code review.
- Verified WebCrypto ↔ Node `crypto` interop for the recovery flow with a standalone round-trip script (encrypt in a WebCrypto-shaped path, decrypt with the exact server-side Node implementation) before considering the design correct.
- Built a full-stack product with Next.js App Router and TypeScript.
- Designed MongoDB/Mongoose schemas for a social content platform, including ciphertext-aware conversation and message models.
- Implemented Firebase authentication with backend user synchronization.
- Built reflection creation, feeds, comments, likes, saves, reposts, and quote posts.
- Added follower/following relationships, follow-back actions, connection lists, and follower notifications.
- Built durable one-to-one messaging with realtime delivery, typing, unread counts, and delivered/seen receipts (double-checkmark, gray → green) in both the conversation view and list.
- Added hashtag discovery and trending hashtag support.
- Implemented streaks and milestone logic to encourage long-term habit formation.
- Added email workflows using React Email and Resend, including an encryption-recovery reminder.
- Added PWA support with service workers, offline behavior, installability, and push notifications.
- Built scheduled cron workflows for recurring engagement.
- Integrated Cloudinary uploads for user media.
- Added SEO-oriented pages and metadata support.
- Set up a Vitest unit test suite and GitHub Actions CI running lint + tests on every push and pull request.
- Improved responsive navigation, profile actions, landing-page routing, chat composition, and PWA UI polish.

## Product Philosophy

MindFuel is not trying to be the loudest social platform. It is trying to be the most useful place to think out loud.

The product is built around a simple belief: when people reflect consistently, they become more aware of what they are learning, how they are changing, and what kind of life they are building.

## Current Status

MindFuel is an active full-stack application with production-oriented features, including authentication, database persistence, media uploads, follower relationships, end-to-end encrypted realtime private messaging with multi-device support and account recovery, notifications, PWA behavior, email delivery, cron jobs, automated testing, CI, and social engagement flows.

## Future Ideas

Commonly requested in comparable journaling/social apps, kept here roughly in order of fit and effort:

| Idea | Category | Why it's next |
| --- | --- | --- |
| **Light mode** | Quick win, sort of | `next-themes` is already installed with an unwired `theme-provider.tsx`. The provider hookup is trivial; the real work is that the UI currently leans on dark-only utility classes throughout, so this needs a proper pass, not just flipping a switch. |
| **Year/month in reflections** | Retention | A Spotify-Wrapped-style recap of a user's own posts, streaks, and growth. Strong share/re-engagement hook, and the milestone/streak data it needs already exists. |
| **Search your own journal** | Core loop | Full-text search scoped to a user's own past reflections — frequently the top ask in journaling apps once someone has 100+ entries and can't find an old one. |
| **Streak freeze** | Habit | One "miss a day without losing your streak" token per month/quarter, Duolingo-style. Reduces the anxiety that causes people to abandon a streak-based product after one bad day. |
| **Voice notes in chat** | Expression | Natural extension of a DM surface once text-only feels limiting, and pairs directly with the encrypted chat that already exists — audio would need the same client-side encryption treatment as text. |
| **Small private groups** | Community | A 3–8 person "accountability circle," distinct from the public feed and from 1:1 messaging. The `encryptedKeys` array already generalizes to N participants cryptographically; the bigger lift is that conversation creation, `otherPerson()`, and the participant-pair key are currently built around exactly two people. |
| **Export your journal** | Data trust | A PDF/markdown export of a user's own reflections — a table-stakes trust signal for anything positioning itself as a personal journal rather than just a social feed. |
| **Mood/theme tagging** | Insight | Light tagging on posts (gratitude, growth, challenge…) feeding a simple "what you've been reflecting on lately" pattern view. Reinforces the personal-growth half of the positioning over the social-feed half. |

Other longer-term ideas: richer privacy controls for public/private/followers-only reflections, moderation tooling for reports, connection-privacy controls and personalized-feed ranking, AI-assisted reflection suggestions, and a mobile app wrapper on top of the existing PWA foundation.
