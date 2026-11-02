# Notifications

How MindFuel decides what to send, when, and how it gets to a device. All rules live in
`src/lib/notification-policy.ts`. Every push goes through `sendCategoryPush` (`src/lib/notify.ts`),
and every email trigger checks `emailAllowed`.

## Categories and defaults

| Category | What | Push default | Email default |
|---|---|---|---|
| `daily` | Daily reflection reminder (and the capped inactivity win-back email) | on | on |
| `replies` | Comments on your reflections, replies to your comments | on | on |
| `likes` | Likes and saves (grouped) | **off** | off |
| `follows` | New followers | on | off |
| `following` | "From people you follow" digest email (email only) | n/a | on |
| `messages` | New messages (never includes text) | on | off |
| `reposts` | Reposts and quotes | on | on |
| `product` | Product updates and the daily mindful tip | **off** | on |

**Legacy switches:**
- `preferences.notifications === false` turns every push category off.
- `preferences.dailyEmail === false` turns every email category off.
- Explicit choices saved in Settings override both. Saving settings stores the fully resolved object, so the legacy switches stop applying.
- Subscribing a device sets `preferences.notifications = true`. The person opted in explicitly.

## Timing and limits

- **Daily reminder:** sent at the person's chosen local hour (`reminderHour`, IANA `timezone`, default 20:00 UTC until their device reports a timezone).
  - Sent at most once per local day (`lastReminderSentOn`).
  - Skipped if they already reflected that local day, or on Saturday and Sunday when `skipWeekends` is on.
  - DST is handled by `Intl.DateTimeFormat`.
- **Trigger:** `.github/workflows/hourly-reminders.yml` calls `/api/cron/daily-prompt-notify` at minute 5 of every hour. It needs the repository secret `CRON_SECRET` and the variable `APP_URL`.
  - This works on any Vercel plan; Hobby crons run once a day at most.
  - The route loads every user with a device each run. Past roughly 50k devices, store the reminder's UTC hour on the user and query by it.
- **"From people you follow" digest:** `/api/cron/following-digest`, called by the same hourly workflow.
  - At 8:00 local time (`DIGEST_HOUR`), at most once per local day (`lastDigestSentOn`, claimed atomically before sending so overlapping runs can't double-send).
  - Covers public, non-repost reflections by people you follow since the last digest (`lastDigestAt`), first time 24 hours, never more than 7 days back. Private reflections never appear. Shows up to 5, then "And N more".
  - No email when there's nothing new. Sent through Resend batch (100 per call) with an idempotency key; a failed batch releases the claim and leaves `lastDigestAt` alone, so those posts appear in the next digest.
  - Signed one-click unsubscribe turns off only this category.
- **Quiet hours:** `quietStart` to `quietEnd`, local time, default 22:00 to 07:00. They may cross midnight. Messages ignore quiet hours if message pushes are on.
- **Daily cap:** 6 non-message pushes per local day (`DAILY_PUSH_CAP`; counters `pushDay` and `pushSentToday`). Further pushes are skipped and counted as `skipped`.
- **Win-back email:** weekly at most, and never more than 3 (`MAX_WINBACKS`) until the person reflects again. `winbackCount` resets on each new reflection.
- **Dedupe and batching:**
  - Like, save, repost and quote notifications are one row per sender, action and post (an upsert). Like, unlike, like refreshes that row instead of adding another.
  - The push text is grouped: "Ada and 4 others liked your reflection".
  - Every push has a `tag` (`like-<postId>`, `conversation-<id>`, `daily-prompt`, `follow-<uid>`), so repeats replace each other on the device instead of stacking.
- **App already open:** the service worker still shows the notification, but silently. Safari revokes subscriptions that receive pushes without a visible notification, and Chrome shows its own generic one.

## Payload format

What `sendCategoryPush` sends:

```json
{
  "title": "Today's reflection",
  "body": "What did today teach you?",
  "icon": "https://…/icon-192.png",
  "badge": "https://…/icon-192.png",
  "tag": "daily-prompt",
  "actions": [{ "action": "open", "title": "Write" }],
  "url": "https://…/create?prompt=…&promptId=…&source=push-reminder",
  "data": { "url": "…", "category": "daily", "type": "daily", "badgeCount": 3 }
}
```

- `actions` only render on Android and desktop Chrome. Other platforms ignore them.
- `badgeCount` is unread notifications plus unread messages. The worker sets the app icon badge from it (installed apps on Android Chrome and iOS 16.4+), and the app keeps it in sync while open.
- Message pushes never contain message text: "New message from Ada" / "Open MindFuel to read it".

## Deep-link map

| Trigger | Opens |
|---|---|
| Daily reminder push, tip push, reminder and tip emails | `/create?prompt=…&promptId=…&source=…` |
| Like, save, comment, reply, repost, quote | `/post/<id>` |
| Follow | `/profile/<firebaseId>` |
| Message | `/messages?with=<firebaseId>` (opens that conversation) |
| Test push | `/settings/notifications?source=test-push` |

`notificationclick` focuses an existing window and navigates it. If the window can't be navigated (it's uncontrolled), the worker posts `mindfuel:navigate` and `ServiceWorkerBridge` routes in-app. With no window open, it opens a new one.

## Subscriptions

- Each device is stored on `User.pushSubscriptions` with `endpoint`, `keys`, `deviceId`, `userAgent`, `platform`, `createdAt` and `lastSeen`. There are at most 10 per user; the oldest is dropped.
- `POST /api/push/subscribe` requires a Firebase token.
- `DELETE /api/push/subscribe` (`{ endpoint }` or `{ deviceId }`) is called on sign-out for the current device and by "Remove" in Settings.
- `POST /api/push/resubscribe` is used by the worker's `pushsubscriptionchange` handler. Possession of the old endpoint identifies the device, because the worker has no session.
- When a push returns 404 or 410, `sendPushNotifications` deletes that endpoint.

## Permission prompts

The browser prompt is only triggered from a click on our own explanation: the success screen after a first reflection, and Settings.
- "Not now" waits 14 days before asking again, and we ask at most 3 times (`src/lib/push-priming.ts`).
- iOS Safari outside the installed app gets Add-to-Home-Screen steps instead. iOS only delivers web push to Home Screen apps (16.4+).
- If permission is denied, Settings shows how to re-enable it on that platform.

## Email unsubscribe

- Every policy-gated email has a signed one-tap link (`/unsubscribe?token=…`, which confirms with one tap so link scanners can't unsubscribe anyone).
- RFC 8058 headers are included: `List-Unsubscribe: <…/api/unsubscribe?token=…>` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click`.
- Tokens are HMAC-signed with `UNSUBSCRIBE_SECRET` (falling back to `CRON_SECRET`). Without either, links go to `/settings/notifications`.

## Observability

`NotificationStat` holds one document per UTC day, category and channel, with `sent`, `failed`, `skipped` and `clicked` totals. There are no user ids or content.
- Clicks are reported by the worker (`POST /api/push/clicked`).
- To get open rates: `clicked / sent`.
- Example query: `db.notificationstats.find({ day: "2026-11-02" })`.

Client funnel events (`src/lib/analytics.ts`): `push_prompt_shown`, `push_prompt_accepted`, `push_prompt_declined`.

## Debugging a push

- **Staging:** Settings → Notifications → "Send a test notification". It's enabled when `VERCEL_ENV !== "production"`; set `ENABLE_TEST_PUSH=0` to hide it.
- **Android Chrome:**
  - Open `chrome://inspect/#service-workers`, inspect the worker, and use **Push** in DevTools → Application → Service workers to send a test payload.
  - Check that the site has notification permission, and that the device isn't in Do Not Disturb or Battery Saver.
- **iOS (16.4+, installed):**
  - Pushes only arrive for the Home Screen app, after permission is granted from a tap inside it.
  - Check Settings → Notifications → MindFuel, and that Focus mode isn't silencing it.
  - Use Safari's Develop → (device) → service worker inspector.
- **Desktop:** DevTools → Application → Service workers → Push. On macOS, also check System Settings → Notifications for the browser.
- **Server:** each send is counted in `NotificationStat`. `skipped` means a preference, quiet hours or the cap. A rising `failed` count means bad endpoints or VAPID problems: check `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`.
- **"Notifications stopped" on iOS:** a subscription that received silent pushes may have been revoked. Remove the device in Settings and turn notifications on again.

## Environment

| Variable | Purpose |
|---|---|
| `CRON_SECRET` | Required for all cron routes (Vercel and the GitHub workflow) |
| `UNSUBSCRIBE_SECRET` | Optional; signs unsubscribe tokens (falls back to `CRON_SECRET`) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Web push |
| `ENABLE_TEST_PUSH=0` | Hide the staging test button |
| GitHub `secrets.CRON_SECRET`, `vars.APP_URL` | Hourly reminder workflow |
