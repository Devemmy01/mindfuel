# MindFuel UX overhaul: final report

Ten stacked pull requests, each based on the one before. Merge them in order, or merge #10 into `dev` once all are reviewed.

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

**Final state:** 119 unit tests pass, lint passes, and the build passes. E2E runs in Playwright **emulation** (desktop Chromium and Pixel 7): guest home, first-run flow with mocked auth, notifications, and an axe scan of 8 public screens plus 2 signed-in screens with zero serious or critical violations.

## Before you merge

1. **`CRON_SECRET`** must be set in Vercel (Production) and as a GitHub Actions secret, together with the GitHub variable `APP_URL`. Every cron route now fails closed without it, and the hourly reminder workflow skips.
2. **Run the tip review** against production: `npx tsx --env-file=.env.local scripts/review-tips.ts`, then the same command with `--apply`. I never wrote to the production database.
3. **Decide the realtime host.** Production Socket.IO returns 500 and the Upstash Redis host no longer resolves. Chat works over HTTP polling; see `docs/chat-architecture.md`.
4. **Run `docs/mobile-qa-checklist.md`** on real devices, including the timed first-reflection run.

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
| **Light theme and toggle** | Tokens and primitives support it (`/dev/design?theme=light`), but older screens still hard-code `text-white` and `white/xx` (about 560 uses). Turning it on would ship broken screens. It needs the screen-by-screen restyle below. |
| **Phase 6 full restyle** (PostCard, PostDetail and comments, Profile, Collections, hashtag pages, Messages visuals, offline page, guides) | Not done, except the sign-in modal feature list, notifications, the tip card, empty states and the shell. Large components (MessagesClient about 2,000 lines, Profile about 1,000, PostCard about 600) should be split before restyling. That's best done as reviewable refactors. |
| **Lighthouse ≥ 90 mobile** | **Not met.** Same machine, mobile preset, two alternating rounds: `/` baseline 52 and 41 against new 28 and 46; `/feed` baseline 29 against new 30. Local runs vary by ±20 points, so they can't show small changes. The live site measured `/` 56 and `/feed` 30. The main costs are JS on every page (the Firebase SDK, socket.io-client and framer-motion in the root layout). Lazy-loading auth and chat on public pages is the next step; measure with PageSpeed Insights on a preview. |
| **Chat features:** message requests, block and mute, swipe actions, image send, delete-for-me, receipt and presence privacy, client-side cursor deltas | New models and permission design, or the MessagesClient split first. Listed in `docs/chat-architecture.md`. |
| **iPhone and iPad WebKit runs** | WebKit couldn't start on Ubuntu 26.04 without `sudo` packages. The projects are configured for CI (`npx playwright install --with-deps`). |
| **Timed real-account first reflection** | Automation can't complete Google sign-in. Mocked auth measured 8.9s on desktop and 2.0s on Pixel 7 (machine time only). |
| **A real-time push or install test** | Needs real devices; it's in the checklist. |

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
