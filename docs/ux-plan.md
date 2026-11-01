# MindFuel UX overhaul: audit and plan

Status: **draft for approval**. No product code has been changed yet.
Baseline (branch `dev` @ `791dcc9`, 2026-11-01): `npm test` 53/53 pass · `npm run lint` passes (warnings only) · `npm run build` passes.

North-star: a brand-new visitor writes their first reflection within 60 seconds.

---

## 1. Audit findings

### 1.1 Blockers found during the audit (must be decided before Phases 4, 8 and 9)

| # | Finding | Evidence | Impact |
|---|---|---|---|
| S1 | **Most API routes trust a client-supplied user id.** Only `app/api/chat/*` and the cron routes verify a Firebase ID token. Everything else reads `userId` / `firebaseId` from the body or query string. | `POST /api/posts` (`app/api/posts/route.tsx:305`), `POST /api/users/profile`, `POST /api/auth/sync` (upserts `email` for any `firebaseId`), `GET/PATCH /api/notifications`, `POST /api/push/subscribe`, saves, collections, likes, comments, reposts, reports. | Anyone who knows a user's firebaseId can post as them, edit their profile or email, read and clear their notifications, and attach their own push endpoint to that account to receive their message alerts. firebaseIds are public: they appear in `/messages?with=<firebaseId>` and in socket payloads. `isSponsored` can also be set by the client. |
| S2 | "Just me" visibility (Phase 4) **cannot be enforced until S1 is fixed.** | `GET /api/posts?userId=&currentUserId=` and `/api/posts/feed?userId=` take the viewer's identity from the query. | A "private" post would be readable by anyone who passes the owner's id. |
| S3 | Unauthenticated side-effect routes. | `GET /api/test/daily-tip-email` sends a real email on every hit. `POST /api/upload` accepts anonymous Cloudinary uploads. `daily-prompt-notify` and `sync-tips` skip auth entirely if `CRON_SECRET` is unset. | Abuse and cost. |
| R1 | **Production realtime is not answering.** `GET https://www.mind-fuel.app/api/socket?EIO=4&transport=polling` and the WebSocket upgrade both return the Next.js **500** page (probed 2026-11-01). | `api/socket.ts` depends on Vercel Functions WebSocket support, per its own comment. `server.ts` (custom server with Socket.IO) only runs under `npm run dev` / `npm start`, never on Vercel. `NEXT_PUBLIC_SOCKET_URL` is not set in `.env.local`; I don't know the production value. | Chat currently works only through the client's 6 s message poll and 4 s typing poll. Live presence, typing and read receipts over the socket are effectively off. |

### 1.2 Realtime and chat (Phase 9 input)

- **Topology as found:** the client (`src/lib/socket.ts`) connects to `NEXT_PUBLIC_SOCKET_URL` or same-origin at `/api/socket`. It sends the Firebase token in the handshake, which the server verifies.
- **Redis adapter:** enabled only when `REDIS_URL` is set (`src/lib/configure-socket.ts`). Even then, a serverless function instance can't hold long-lived rooms reliably.
- **Send path:** REST `POST /api/chat/messages` is the durable write. The **client** then emits `message:published` and the server relays it to the recipients. If the sender's socket is down, recipients only get the message on their next poll.
- **Reconnect:** `reconnectionAttempts: 5`, after which the client gives up for good. There is no jitter, no `online` or `visibilitychange` resync, and no cursor.
- **Resync:** `GET /api/chat/messages` always returns the last 200 messages (no cursor or `after` parameter), and the client re-fetches the full window every 6 s.
- **No idempotency key on send:** a retry after a timeout can duplicate a message. The optimistic queue lives in memory only, so it doesn't survive a reload.
- **Encryption:** RSA-OAEP + AES-GCM. The server stores only ciphertext and IV. Message push payloads are already generic ("New message from <first name>"), which is good and will stay that way.
- **Missing features:** mute, pin, block, message requests, delete-for-me, and receipt/presence privacy settings. `app/api/reports` exists to build on.

### 1.3 Push and notifications (Phase 8 input)

- **Silent pushes:** `worker/index.ts` returns without showing a notification for `type: "message"` when any window is visible. Safari revokes subscriptions after repeated silent pushes, and Chrome shows a generic "site updated in the background" notification. Foreground suppression has to happen server-side instead (skip sending when the user is active).
- **No subscription refresh:** no `pushsubscriptionchange` handler. No unsubscribe on sign-out. Subscriptions don't store userAgent, createdAt or lastSeen.
- **Permission timeout:** `usePushNotifications` races `requestPermission()` against a **5 s timeout**. Users who take longer than 5 s to answer the prompt get an error and aren't subscribed. Opt-in exists only on the Profile page.
- **Wrong badge:** the app badge shows **streak days**, not unread items (`useAppBadge` / `ClientBadgeUpdater`), and is cleared on every mount.
- **Coarse preferences:** a single `preferences.notifications` boolean plus `preferences.dailyEmail`. No categories, no time or timezone, no quiet hours.
- **Cron coverage (`vercel.json`):** only `daily-tip`, `inactivity-reminder` and `chat-recovery-reminder` are scheduled. **`daily-prompt-notify` (the daily reminder push) and `sync-tips` are not**, so the reminder push likely never fires in production unless an external scheduler calls it. `app/api/cron/daily-fuel/` is an empty directory.
- **Deep links:**
  - `daily-prompt-notify` → `/create?prompt=…&promptId=…` ✅
  - `daily-tip` push → `https://mind-fuel.app` (apex domain, not the composer)
  - Message push → `/messages?with=<firebaseId>`: opens the conversation but not the unread marker.
- **Email:** the "Unsubscribe" link in `DailyTipEmail` points to **`/settings`, which doesn't exist**. No email sets a `List-Unsubscribe` header.
- **Notification model:** `type` is missing `"message"`. `postId` is `required` but follow notifications have none; they get in through a `findOneAndUpdate` upsert that skips validation. The list is capped at 30 with no pagination.
- **Rate limits:** no rate limiting on any push, notification or chat endpoint.

### 1.4 PWA and install

- **Manifest (`public/manifest.json`):** has `id` (`/feed`), `start_url` (`/feed?source=pwa`), maskable icon, share target, and `orientation: portrait-primary` (which locks iPad/tablet to portrait).
  - Missing: screenshots, an "any"-purpose 512 PNG distinct from the maskable one, and a "Saved" shortcut.
  - The "New Post" shortcut wording needs updating to match the new copy.
- **Viewport:** `app/layout.tsx` has no `viewportFit: "cover"`, so `env(safe-area-inset-*)` resolves to 0 on iOS. Theme colours are set for both schemes.
- **Committed build output:** `next-pwa` writes `public/sw.js`, `workbox-*.js`, `worker-*.js` and `fallback-*.js` into git. Every build dirties the tree and stale files can ship. They should be git-ignored.
- **No update flow:** `skipWaiting: false` and there's no "New version available" UI, so users stay on the old app until every tab closes.
- **Install:** `InstallPWA.tsx` registers the SW and shows an install card based on visit counts. It has **no iOS "Add to Home Screen" path**, and dismissal is stored per browser in localStorage.

### 1.5 UX findings A–H (confirmed in code)

- **A.** `/` renders `LandingPage` and its only CTA opens the sign-in modal. Also, `/about` and `/features` are **permanent 308 redirects** to `/#about` and `/#features` (`next.config.ts`). Moving marketing to `/about` reverses a cached permanent redirect. It's workable, but browsers that cached the 308 will keep redirecting for a while. Alternative: `/how-it-works`.
- **B.** `OnboardingOverlay` stores its seen flag in localStorage. The jargon is confirmed at lines 336 and 346.
- **C. Feed tab semantics (`app/api/posts/feed/route.ts`):**
  - "Reflections" = posts that answer *any* prompt (originals only, today's prompt boosted ×3).
  - "Feed" = everything plus reposts, with followed authors boosted ×1.75.
  - Neither is a strict "Following" tab. Proposed names: **"Prompt answers"** and **"Everything"**. A real "Following" filter would be a new API parameter.
- **D.** `CardCreator` has no visibility option and shows "Everyone can reply".
- **F.** The guest submit path calls `openSignInModal()` (a popup) and returns. The text survives in memory but is lost on reload or redirect.
- **G.** Tips come from ZenQuotes, Quotable and Advice Slip with no screening; `$sample` serves any document. The "missed payments" tip is in the database, not in the repo.
- **H.** No analytics events exist. Only `<Analytics />` page views are recorded.

### 1.6 Design system baseline

| Item | Current state |
|---|---|
| Arbitrary text sizes | 424 uses of `text-[Npx]`, 25 distinct values |
| Arbitrary radii | 36 uses of `rounded-[…]`, 17 distinct values |
| Z-index | 22 distinct `z-[…]` values, from `z-[1]` to `z-[100000]` |
| Raw hex colours in TSX | 174 |
| Decorative effects | 20 blur orbs, 7 `animate-pulse` |
| Primitives in `src/components/ui/` | `button`, `IconButton`, `Skeleton`, `Toast`, `dropdown-menu`, `NativeEmojiPicker` |
| Tokens | HSL shadcn-style tokens already in `app/globals.css`. Dark theme is a green-tinted black (`#010302`). |
| Font | Inter, already loaded via `next/font` |
| Inputs | 22 `<input>`/`<textarea>` elements; sizes still to check against the 16 px minimum |

---

## 2. Decisions I need from you

1. **Phase 0 — auth hardening (API contract change).** Add a `requireFirebaseUser` check to every mutating or private route and derive the user from the token, never from the body. The client gets a small `authedFetch` helper (`chat-api.ts` already does this). Body `userId` fields are ignored, then removed. I'd ship this first and on its own, because it's a security fix independent of the redesign. **Approve?**
2. **Post visibility schema (Phase 4.1) — proposal:**
   - `Post.visibility: "private" | "public"`, indexed.
   - Existing posts get no field and are treated as `public`, so no migration is needed.
   - New posts **default to `"private"`**, matching your "Just me (default)".
   - `POST /api/posts` accepts `visibility`. `PATCH /api/posts/[id]` lets the owner change it.
   - Every public read path adds `{ visibility: { $ne: "private" } }`: the feed aggregation (both tabs and the in-memory feed cache key), `GET /api/posts` for other users, hashtag pages, search, trending counts, `sitemap.ts`, the OG image route, quotes and reposts. Private posts can't be liked, reposted or quoted by others, and can't be shared to DM.
   - **Post page:** `/post/[id]` is server-rendered and auth is client-only, so the server can't identify the owner. For a private post the server returns a `noindex` shell. The client then fetches `GET /api/posts/[id]` with the owner's token: the owner sees the post, and everyone else gets `notFound()`-equivalent UI and a 404 from the API.
   - The alternative is a Firebase session cookie, which is a bigger auth change and not recommended now.
   - Open question: does a private post still count toward the streak and milestones? I assume **yes**.
3. **Realtime (R1).** What is `NEXT_PUBLIC_SOCKET_URL` in production, and is a separate socket host intended? Options:
   - (a) Debug the Vercel WebSocket function (logs, `vercel.json` runtime).
   - (b) Run `server.ts` on a small always-on host (Fly, Railway, Render) with Redis.
   - (c) Accept polling and replace it with a cursor-based delta poll plus SSE. That's honest about the platform and cheap.

   My recommendation is **(b) if you want presence and typing, otherwise (c)**. I won't change the realtime architecture until you choose.
4. **Marketing route.** `/about` (reverses the cached 308) or `/how-it-works` (new URL, keeps the 308 from `/about`)? I recommend `/about`, with sitemap and canonical updated and the 308 removed.
5. **Cron schedule.** Should `daily-prompt-notify` run hourly to support per-user local reminder times? Vercel Pro allows hourly crons; Hobby does not. Which plan is the project on?
6. **Dev-only dependencies:** `@playwright/test` and `@axe-core/playwright` (devDependencies, not shipped). OK?
7. **Timed real-account run.** I can't complete Google sign-in in automation. The ≤ 60 s measurement with a real Google account has to be run by you; I'll script everything around it. The Playwright draft-restore test will mock auth.
8. **Tip screening.** A `Tip.status: "approved" | "pending" | "rejected"` field plus a blocklist pass in `sync-tips`. Only `approved` tips are served. A review script approves the existing tips in bulk after the blocklist. The "hide tip card" setting is stored on the user (`preferences.showTips`). OK to extend the Tip and User schemas this way?

---

## 3. Design-token system (Phase 1)

Implement the system in `app/globals.css` (CSS variables) and map it into `tailwind.config.mjs`. Components then use semantic classes only.

- **Colour (semantic tokens, dark-first)**
  - Neutral zinc surfaces, replacing the green-tinted black.
  - `--bg`, `--surface`, `--surface-raised`, `--border`, `--border-strong`, `--text`, `--text-muted`, `--text-subtle`.
  - Accents: `--accent` `#00bf63`; `--accent-hover` `#00a855`; `--accent-fg`.
  - Status: `--danger`, `--success`, `--warning`.
  - Dark: bg `zinc-950`, surface `zinc-900`, border `white/8%`. Light: bg `#fafafa`, surface white, border `zinc-200`.
  - Contrast: green text on light backgrounds fails AA at small sizes, so light mode uses a darker `--accent-text` (≈ `#007a40`) for text, keeping `#00bf63` for fills.
  - Existing shadcn token names stay as aliases during migration, so nothing breaks mid-way.
- **Type:** Inter (already loaded). Tokens:

  | Token | Size / line-height | Weight |
  |---|---|---|
  | `display` | 36/40 | 700 |
  | `h1` | 28/34 | 700 |
  | `h2` | 22/28 | 600 |
  | `h3` | 18/24 | 600 |
  | `body` | 16/24 | — |
  | `body-sm` | 15/22 | — |
  | `caption` | 13/18 | — |
  | `micro` | 12/16 | — |

  `tabular-nums` applies to all counts. The 25 arbitrary sizes map onto this scale.
- **Radius:** `sm` 8px (chips, inputs), `md` 12px (buttons, cards), `lg` 20px (sheets, modals), plus `full`.
- **Spacing:** Tailwind's 4px scale. Layout tokens: `--rail-w` 88 / 264, `--right-rail-w` 320, `--tabbar-h` 56 plus the safe area.
- **Elevation:** `shadow-1` (raised card), `shadow-2` (popover), `shadow-3` (modal). Dark mode relies more on borders than on shadows.
- **Z-index scale (replaces all 22 values):**

  | Token | Value |
  |---|---|
  | `base` | 0 |
  | `sticky` | 10 |
  | `rail` | 20 |
  | `tabbar` | 30 |
  | `dropdown` | 40 |
  | `overlay` | 50 |
  | `modal` | 60 |
  | `toast` | 70 |
  | `tooltip` | 80 |

- **Focus:** a 2px `--accent` ring with a 2px offset in `--bg`, on `:focus-visible` only.
- **Motion:** `--dur-fast` 120ms, `--dur` 200ms, `--ease-out`. All motion is disabled under `prefers-reduced-motion`. Blur orbs and decorative pulses are removed.
- **Primitives (`src/components/ui/`, using CVA):**
  - Button (primary / secondary / ghost / danger; sizes sm, md, lg with 44px touch height; loading state), IconButton (requires `aria-label`).
  - Input and Textarea (16px font, autosize), Card, Avatar (fixed sizes, no layout shift), Badge and Chip.
  - Tabs (roving tabindex), Modal and Sheet (focus trap, Esc to close, bottom sheet on touch), Tooltip (works on hover, focus and long-press), EmptyState, Skeleton, Toast.
  - Showcase page `app/dev/design/page.tsx` calls `notFound()` outside development. It's disallowed in robots and omitted from the sitemap.

## 4. Phase order (revised)

Each phase gets its own branch (`ux/phase-N-…`) and PR. Each phase must pass lint, test and build. Screenshots go to `docs/ux-review/phase-N/` (desktop 1280×800 and mobile 390×844, dark and light).

| Phase | Scope | Notes |
|---|---|---|
| **0** | Auth hardening (S1, S3), push-subscribe auth, gitignore the PWA build output, add `viewportFit: cover` | New. Prerequisite for 4, 8 and 9. Tests for each route's auth. |
| 1 | Design system and primitives | No behaviour change. |
| 2 | Shell, navigation, `src/lib/copy.ts`, tab renames, guest nav | Messages hidden for guests. |
| 3 | Guest-first `/`, marketing moved to `/about` | SEO, JSON-LD and canonical preserved. |
| 4 | 60-second flow, visibility (after approval), draft restore, success screen, coachmark, `onboardedAt`, empty states, analytics events | Playwright with mocked auth. |
| 5 | Returning-user home, deep-link audit, quiet "What's new" | |
| 8 | Notifications | **Moved before 6.** It fixes live bugs (5 s permission timeout, silent pushes, missing cron, broken unsubscribe link). |
| 6 | Restyle the remaining screens | |
| 9 | Chat (after the realtime decision) | Crypto untouched without a written proposal. |
| 7 | Content safety and performance polish | |
| 10 | Mobile, offline queue, performance budgets, accessibility passes | Cross-cutting mobile rules apply from Phase 1 onward. |

## 5. Files expected to change (by phase)

- **0:**
  - `src/lib/firebase-admin.ts` and a new `src/lib/authed-fetch.ts`
  - All routes listed under S1
  - Their callers: `CardCreator`, `ProfileDetailClient`, `AuthProvider`, `InteractionBar`, `CommentSection`, `NotificationsList`, `MindfulSaves`, `app/collections`, `usePushNotifications`
  - `.gitignore`, `app/layout.tsx`
- **1:** `app/globals.css`, `tailwind.config.mjs`, `src/components/ui/*`, `app/dev/design/*`, `public/robots.txt`
- **2:** `LayoutContent.tsx`, `Navbar.tsx` (822 lines, to be split into `AppRail`, `BottomTabBar` and `UserMenu`), the `FeedClient.tsx` header, right-rail components, `src/lib/copy.ts`, `public/manifest.json` (shortcut copy)
- **3:** `app/page.tsx`, `LandingPage.tsx` → `app/about/page.tsx`, a new `GuestHome`, `next.config.ts` (redirects), `app/sitemap.ts`, `middleware.ts` (only the `?view=landing` target; CSP untouched)
- **4:**
  - Components: `CardCreator.tsx`, the success screen, `Coachmark`, `StreakDisplay.tsx`, empty states
  - Removed: `OnboardingOverlay.tsx`
  - Models: `src/models/post.ts`, `src/models/user.ts` (`onboardedAt`)
  - Routes: the posts routes, `app/api/users/profile`, `app/post/[id]`
  - New: `src/lib/analytics.ts`
- **5:** the feed/home entry point, `app/api/cron/*` deep links, `src/emails/*`, `Navbar` user menu, `src/config/updates.json` consumer
- **8:**
  - `worker/index.ts`, `usePushNotifications.ts`, `useAppBadge.ts`, `sendPushNotifications.ts`, `src/lib/notifications.ts`
  - Models: `notification`, `user` (preferences, per-device subscriptions)
  - New `app/settings/notifications`; `NotificationsList.tsx`; the cron routes; email `List-Unsubscribe` headers plus `app/api/unsubscribe`; `vercel.json`
- **9:** `MessagesClient.tsx` (2,032 lines, to be split into list, thread and composer), `src/lib/socket.ts`, `configure-socket.ts`, `app/api/chat/messages` (cursor and idempotency key), `ShareToDmModal.tsx`. **Not touched without a proposal:** `chat-crypto.ts` and the keys, link and recovery routes.
- **7 and 10:** `MindfulTip.tsx`, `src/models/tip.ts`, `sync-tips`, `OfflineNotice.tsx`, `app/offline`, `InstallPWA.tsx`, `usePullToRefresh.ts`, `next.config.ts` runtime caching

## 6. Risks

- **Auth migration:** clients on cached old bundles will keep sending body ids without a token. Mitigation: accept a token *or* fail with a clear 401 and a "Refresh" toast. The service-worker update flow (Phase 8/10) reduces how long stale clients linger.
- **The visibility default flips existing behaviour.** Users who expect posts to be public will create private ones. The control must be obvious, and the success screen says "Only you can see this — share it?"
- **Feed cache leaks:** the in-memory feed cache (`app/api/posts/feed/route.ts`) is keyed by viewer id from the query. After Phase 0 it must be keyed by the verified uid, or private posts could leak between viewers.
- **Removing the `/about` 308:** visitors whose browsers cached the permanent redirect keep landing on `/#about` until the cache expires. Mitigation: keep an `#about` anchor on `/` that links to `/about`.
- **SW changes are sticky.** A bad worker can strand users. Every SW change ships with the update prompt and a kill-switch path.
- **Emulation is not a device.** Playwright's WebKit iPhone and Pixel profiles can't test real push, install, the iOS keyboard or safe areas. These go on `docs/mobile-qa-checklist.md` for you.
- **Size:** `Navbar.tsx` (822 lines), `MessagesClient.tsx` (2,032) and `ProfileDetailClient.tsx` (1,056) need refactors to restyle safely. I'll split them before restyling, with no behaviour change, in their own commits.
- **Lighthouse ≥ 90 on mobile:** `/feed` loads 300 kB+ of first-load JS. Reaching the target likely needs code-splitting `CardCreator`, the emoji picker and framer-motion. I'll report real numbers rather than promise them.

## 7. Deliverables tracking

Created during the phases:

- `docs/ux-plan.md` (this file)
- `docs/notifications.md` (Phase 8)
- `docs/chat-architecture.md` (Phase 9; current topology as described in §1.2)
- `docs/mobile-qa-checklist.md` (started in Phase 2, completed in Phase 10)
- `docs/ux-review/phase-N/` screenshots
- A final report

---

## 8. Decisions taken (2026-11-01, delegated by the owner: "go ahead with all")

| # | Decision | Rationale |
|---|---|---|
| 1 | Phase 0 auth hardening ships first, as its own PR. | It's a security fix and a prerequisite for private posts. |
| 2 | `Post.visibility` defaults to `"private"` for new posts. Existing posts count as public. Private posts count toward streaks and milestones. | Prevents accidental publishing (finding D). The streak measures the habit, not the audience. |
| 3 | **Realtime:** make chat correct *without* a socket (cursor-based delta sync, idempotent sends, a persistent outbox). The socket stays an optional accelerator. Hosting `server.ts` on an always-on host is documented in `docs/chat-architecture.md` as the upgrade path. | Changing hosting needs accounts and billing I don't have, and production sockets currently return 500. |
| 4 | Marketing content moves to `/about`. The `/about → /#about` 308 is removed. | The URL is the clearest choice, and a `#about` anchor on `/` covers cached redirects. |
| 5 | The daily reminder runs **hourly** through a GitHub Actions workflow that calls the cron route with `CRON_SECRET`. It works on any Vercel plan. | I don't know the Vercel plan, and an hourly Vercel cron fails to deploy on Hobby. |
| 6 | `@playwright/test` and `@axe-core/playwright` are added as devDependencies. | Screenshots and accessibility checks; nothing is shipped to users. |
| 7 | The timed real-Google-account run is left to the owner. | Automation can't complete Google sign-in. |
| 8 | Tip screening uses `Tip.status` plus a blocklist. The "hide tips" setting is `preferences.showTips`. | |
| 9 | No test writes to the database in `.env.local`. It's an Atlas cluster, probably production. Signed-in flows are tested with mocked `/api/*` responses. | Protects real user data. |

**Owner action required:** set `CRON_SECRET` in Vercel (Production) and as a GitHub Actions secret. Without it, every cron route now returns 401.
