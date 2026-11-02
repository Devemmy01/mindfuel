# MindFuel UX overhaul: final report

Fifteen stacked pull requests, each based on the one before. Merge them in order, or merge #15 into `dev` once all are reviewed.

| PR | Phase | Branch |
|---|---|---|
| #1 | 0. Token-based API identity (security) | `ux/phase-0-auth-hardening` |
| #2 | 1. Design tokens and primitives | `ux/phase-1-design-system` |
| #3 | 2. App shell, navigation, one vocabulary | `ux/phase-2-shell-nav` |
| #4 | 3. Guest-first home, `/about` | `ux/phase-3-guest-home` |
| #5 | 4. 60-second first run, private-by-default reflections | `ux/phase-4-first-run` |
| #6 | 5. Returning members | `ux/phase-5-returning` |
| #7 | 8. Notifications | `ux/phase-8-notifications` |
| #8 | 9. Chat reliability | `ux/phase-9-chat` |
| #9 | 7. Content safety and accessibility | `ux/phase-7-safety` |
| #10 | 10. Mobile and PWA (plus a Phase 6 item) | `ux/phase-10-mobile` |
| #11 | 11. Realtime on Vercel (WebSocket route) | `ux/phase-11-realtime` |
| #12 | 12. First-load JavaScript cut by 40–48% | `ux/phase-12-performance` |
| #13 | 13. "From people you follow" digest email, email dark mode, reload fix | `ux/phase-13-digest` |
| #14 | 14. Light theme (System / Light / Dark) | `ux/phase-14-light-theme` |
| #15 | 15. Block and mute; encrypted-images proposal | `ux/phase-15-chat-safety` |

**Final state:** 136 unit tests pass, lint passes, and the build passes. E2E runs in Playwright **emulation** (desktop Chromium and Pixel 7): guest home, first-run flow with mocked auth, notifications, and an axe scan of 8 public screens plus 2 signed-in screens with zero serious or critical violations.

## Before you merge

1. **`CRON_SECRET`:** I tried to set it and was blocked from writing secrets, and the Vercel CLI here isn't logged in. Generate one value and set it in three places:
   - `openssl rand -hex 32`
   - Vercel → Settings → Environment Variables → `CRON_SECRET` (Production)
   - `gh secret set CRON_SECRET` (paste the same value)
   - `gh variable set APP_URL --body https://www.mind-fuel.app`

   Every cron fails closed without it; the hourly workflow (reminders and the new digest) skips.
2. **Tip review: no longer blocking.** The `MONGODB_URI` in `.env.local` points to an empty `test` database, not production, so the script found nothing to review. It doesn't need to run: the app already hides joke-advice tips until approved and screens every tip when it's read. To clean up production anyway, run `scripts/review-tips.ts` with the production URI.
3. **Realtime host: decided, stay on Vercel** (#11). Vercel Functions serve WebSockets on all plans. The old `api/socket.ts` 500'd because a Next.js project never routes a root `api/` server.
   - Make sure Fluid compute is on (Settings → Functions).
   - For live typing and presence across instances, add Redis from the Vercel Marketplace and set `REDIS_URL`. The current Upstash host doesn't resolve.
   - Without Redis, messages still arrive (polling) and live events reach people on the same instance only.
4. **Run `docs/mobile-qa-checklist.md`** on real devices. Also check Messages, Profile and Collections in the light theme, which automation couldn't reach.

## What changed (highlights)

- **Security (Phase 0):** most API routes trusted a user id sent by the browser, so anyone could post as someone else, edit their profile or email, read their notifications, or register push endpoints on their account. Identity now comes from the verified Firebase token, crons require the secret, and comment deletion is authorised.
- **Privacy:** reflections are **private by default** ("Just me" or "Community"). This is enforced on the server in every read path, including the feed, hashtags, trending, sitemap, OG images, quotes, saves and other people's view of a profile. Legacy posts stay public.
- **First run:** `/` lets a guest write immediately; saving signs them in and posts exactly once. Blocked or cancelled sign-in and failed saves keep the text. "Saved. Day 1 started.", an optional share, a reminder offer, and a 3-step coachmark replace the 5-slide overlay.
- **Navigation:** labelled desktop rail; a five-tab mobile bar (Home, Search, Reflect, Alerts, Profile); guests see only Home, Search and Reflect; Messages is in the top bar; a single "Reflect" verb; feed tabs named by what they contain ("Prompt answers", "Everything").
- **Returning members:** Home opens on today's reflection, ready to type, or on the streak and week once done. Emails and pushes deep-link to the prompt.
- **Notifications:** a server policy with per-category push and email, local reminder time and timezone, quiet hours, a daily cap, batching and collapse tags. The daily reminder now actually runs (it was never scheduled). Settings and device management, one-tap unsubscribe, the unread app badge, and correct service-worker behaviour on iOS.
- **Chat:** idempotent sends (`clientMessageId`), a persistent ordered outbox with Retry, unlimited jittered reconnect, honest connection state, a server rate limit, and a resync cursor. The encryption code is unchanged.
- **Content safety:** the off-tone tip came from a live, unscreened Advice Slip call. It's removed; tips are screened and reviewed, and the card can be hidden.
- **Mobile and PWA:** a new-version refresh prompt, an install card after the first reflection (iOS shows the steps), keyboard-safe composers on iOS and Android, 16px inputs on touch screens, an offline queue for reflections, and manifest screenshots.
- **Design system:** themed tokens, a type scale, primitives and `/dev/design`. Inter now actually loads, and primary buttons pass contrast.

## Bugs found by the tests along the way
- A guest who signed in on `/` was redirected away mid-save.
- A reflection could post **twice** when sign-in and the resume effect raced.
- Composer autofocus never applied (it was set after mount).
- Text typed before hydration finished was wiped on slow phones.
- Push permission timed out after 5 seconds, leaving people unsubscribed.
- The coachmark heading role was wrong.

## What I did not do, and why

| Item | Why |
|---|---|
| **Lighthouse ≥ 90 mobile** | **Not met, or not provable here.** First-load JS is down 40–48% (#12), but local scores swing 42–63 on the same build. Remaining costs: React render work on the feed, and Firebase's Google iframe, which is kept on purpose because Safari blocks the sign-in popup without it. Measure with PageSpeed Insights on production. |
| **Restyle of the large legacy screens** (PostCard, PostDetail, Profile, Messages internals) | They're now themed (#14) but not redesigned. Split the big components first (Messages about 2,100 lines, Profile about 1,100). |
| **Encrypted image sending** | Needs a crypto change; the proposal is `docs/proposals/chat-image-attachments.md` and needs your sign-off. |
| **Message requests, swipe actions, delete-for-me, link previews** | Message requests need a product decision on who may message whom. |
| **iPhone and iPad WebKit runs** | WebKit can't start on Ubuntu 26.04 without `sudo` packages; they're configured for CI. |
| **Timed real-account first reflection; real push and install** | Needs Google sign-in and real devices; they're in the checklist. |

## Verified only in emulation; needs your real-device confirmation
- Keyboard behaviour (the iOS visual viewport, Android `interactive-widget`), safe areas, zoom-on-focus.
- Install prompts and Add-to-Home-Screen steps, the update prompt, the standalone launch and shortcuts.
- Every push path: priming, delivery at local time, deep links, the badge, silent display while open, `pushsubscriptionchange`, sign-out unsubscribe.
- Chat offline, reconnect, ordering and backgrounding; the offline reflection queue.
- VoiceOver and TalkBack announcements.

## Risks in the existing realtime and push setup
- **The production socket endpoint is broken (500),** and Redis is unreachable. Presence, typing and instant delivery depend on polling (6s), which costs requests and battery.
- **Reminders scan all subscribed users every hour.** That's fine now; past about 50k devices, index by the reminder's UTC hour.
- **Decrypted chat text is kept in `localStorage`** (the existing cache and the new outbox) on the device.
- **Subscriptions taken out under the old silent-push behaviour may already be revoked on iOS.** Affected users need to re-enable notifications in Settings.
- **Re-subscribe trusts possession of the old endpoint,** which is an unguessable URL. That's acceptable, but noted.

## Open questions
1. Which realtime host do you want: an always-on socket host plus Redis, or SSE?
2. Should Community become the default once people have used the app for a while? Right now Just me is always the default.
3. Should chat-message email notifications exist? The category exists, off by default.
