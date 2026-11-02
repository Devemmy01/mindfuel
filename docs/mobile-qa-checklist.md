# Mobile QA checklist (real devices)

Automated tests ran in **Playwright emulation**: Chromium desktop and Pixel 7 profiles. WebKit iPhone and iPad projects are configured for CI, but couldn't run on the build machine. Emulation doesn't exercise real push, installation, the iOS keyboard, safe areas, Home Screen behaviour or background suspension. Run this list on real hardware before release.

**Devices:**
- **A:** iPhone, Safari, not installed.
- **B:** iPhone, installed PWA (Share → Add to Home Screen; iOS 16.4+).
- **C:** Android, Chrome, not installed.
- **D:** Android, installed PWA.
- **E:** Android, Samsung Internet.

Mark each cell ✅ / ❌ / n/a, and add a note for every ❌.

## 1. First visit and first reflection

| # | Check | A | B | C | D | E | Notes |
|---|---|---|---|---|---|---|---|
| 1.1 | `/` loads with the value line, today's prompt and an open composer; no modal | | | | | | |
| 1.2 | Tapping the composer opens the keyboard; the page does **not** zoom | | | | | | |
| 1.3 | Typed text stays visible above the keyboard while writing | | | | | | |
| 1.4 | "Just me" is selected by default; switching to Community shows the guidelines line | | | | | | |
| 1.5 | Save → Google sign-in → returns → "Saved. Day 1 started." with exactly **one** post created | | | | | | |
| 1.6 | Close the Google popup without signing in: a clear message appears and the text is still there | | | | | | |
| 1.7 | With pop-ups blocked: a clear message appears and the text is still there | | | | | | |
| 1.8 | **Timed run:** fresh profile, `/` to "Saved": record seconds (target ≤ 60) | | | | | | |
| 1.9 | Visit Home after the first reflection: the 3-step tour appears, Esc/Skip closes it, and it doesn't reappear on another device | | | | | | |

## 2. Navigation, layout and safe areas

| # | Check | A | B | C | D | E | Notes |
|---|---|---|---|---|---|---|---|
| 2.1 | The bottom tab bar sits above the home indicator and nothing hides under it | | | | | | |
| 2.2 | Top bars clear the notch and status bar (installed apps especially) | | | | | | |
| 2.3 | No horizontal scrolling at the narrowest width (rotate to portrait on the smallest device) | | | | | | |
| 2.4 | Every tab works; the Messages icon is in the top bar when signed in | | | | | | |
| 2.5 | Swipe-back (iOS) and the back button (Android) go to the previous screen, never trapped | | | | | | |
| 2.6 | Pull-to-refresh on Home and Notifications refreshes and doesn't fight the browser's own pull | | | | | | |
| 2.7 | Text size at 200% (browser zoom or Dynamic Type): layouts reflow, no clipped controls | | | | | | |
| 2.8 | Rotating the iPad to landscape works (orientation is no longer locked) | | | | | | |

## 3. Keyboard

| # | Check | A | B | C | D | E | Notes |
|---|---|---|---|---|---|---|---|
| 3.1 | `/create`: the bottom toolbar (visibility, emoji) stays above the keyboard | | | | | | |
| 3.2 | Chat: the message input stays above the keyboard; the thread stays anchored to the bottom | | | | | | |
| 3.3 | Search, comments and settings selects never zoom the page on focus | | | | | | |

## 4. Install

| # | Check | A | B | C | D | E | Notes |
|---|---|---|---|---|---|---|---|
| 4.1 | No install card on the first visit | | | | | | |
| 4.2 | Next Home visit after the first saved reflection: install card (Android) or Add-to-Home-Screen steps (iOS Safari) | | n/a | | n/a | | |
| 4.3 | Dismiss: it doesn't come back for 30 days | | | | | | |
| 4.4 | Never shown inside the installed app | n/a | | n/a | | n/a | |
| 4.5 | The installed app opens on Home (`/feed`), and the shortcuts (Reflect, Saved, Profile) work on long-press | n/a | | n/a | | n/a | |
| 4.6 | After a deploy: "A new version of MindFuel is ready · Refresh" appears and refreshing loads the new version | n/a | | | | | |

## 5. Notifications (push)

| # | Check | A | B | C | D | E | Notes |
|---|---|---|---|---|---|---|---|
| 5.1 | The browser prompt only appears after tapping "Turn on" in our explanation, never on load | | | | | | |
| 5.2 | iOS Safari, not installed: shows Add-to-Home-Screen steps instead of a prompt | | n/a | n/a | n/a | n/a | |
| 5.3 | Accept: Settings → Notifications lists this device | | | | | | |
| 5.4 | Staging "Send a test notification" arrives; tapping it opens Settings | | | | | | |
| 5.5 | Set the reminder for the next hour: the reminder arrives at that **local** time; tapping opens the composer with today's prompt | | | | | | |
| 5.6 | Having already reflected today: no reminder arrives | | | | | | |
| 5.7 | Turn off "Replies": a comment from another account sends no push | | | | | | |
| 5.8 | A message push says "New message from …" with **no message text**; tapping opens that conversation | | | | | | |
| 5.9 | The app icon badge shows unread notifications plus messages and clears after reading | n/a | | n/a | | | |
| 5.10 | Push arrives while the app is open: a notification still appears (silently) and counts update | | | | | | |
| 5.11 | Deny permission: Settings shows how to re-enable it on this platform | | | | | | |
| 5.12 | Sign out: this device stops receiving pushes for that account | | | | | | |

## 6. Chat reliability

| # | Check | A | B | C | D | E | Notes |
|---|---|---|---|---|---|---|---|
| 6.1 | Airplane mode: send 3 messages; "You're offline…" shows; reconnect: all 3 arrive **once, in order**, on both phones | | | | | | |
| 6.2 | Kill the app while a message is unsent; reopen online: it sends | | | | | | |
| 6.3 | Background the installed app for 5 minutes, then return: no duplicate or missing messages | | | | | | |
| 6.4 | A failed message shows "Not sent · Retry"; Retry sends it once | | | | | | |

## 6b. New chat features (two real accounts)

| # | Check | A | B | C | D | E | Notes |
|---|---|---|---|---|---|---|---|
| 6.5 | Send a photo: it arrives and opens full size on the other phone; a photo with GPS data has no location after download | | | | | | |
| 6.6 | Delete for everyone: the other phone shows "This message was deleted" without refreshing | | | | | | |
| 6.7 | Delete for me: gone on this phone, still there on the other | | | | | | |
| 6.8 | Message someone who doesn't follow you: it lands in their Requests (one push), and your side shows no "read" until they accept | | | | | | |
| 6.9 | Swipe a bubble right: the reply bar opens; scrolling vertically never triggers it | | | | | | |
| 6.10 | Paste a link, tap "Add link preview": the card shows on both phones | | | | | | |
| 6.11 | Block from a profile: neither side can message or follow; Unblock restores messaging | | | | | | |
| 6.12 | Mute a chat: no push for new messages there, but they still appear in the app | | | | | | |

## 7. Offline

| # | Check | A | B | C | D | E | Notes |
|---|---|---|---|---|---|---|---|
| 7.1 | Offline, save a reflection: "You're offline. Your reflection will post when you're back online." | | | | | | |
| 7.2 | Reconnect: "Your reflection was posted." Exactly one post exists | | | | | | |
| 7.3 | Offline navigation shows the offline page or a cached Home, not a browser error | | | | | | |

## 8. Screen readers (VoiceOver on iOS, TalkBack on Android)

| # | Check | iOS VoiceOver | Android TalkBack | Notes |
|---|---|---|---|---|
| 8.1 | Home composer: the prompt is read as the field's label; the visibility radios announce their state | | | |
| 8.2 | Feed tabs announce "tab, 1 of 2, selected" | | | |
| 8.3 | The tab bar and rail announce destination names and unread counts | | | |
| 8.4 | Notifications: day groups and "Unread:" items are announced | | | |
| 8.5 | Dialogs (reminders, What's new) trap focus and close with the escape gesture | | | |
| 8.6 | Chat: new messages are announced; the input is labelled | | | |

## 9. Accounts and privacy

| # | Check | Result | Notes |
|---|---|---|---|
| 9.1 | A "Just me" reflection is not visible to a second account (post link shows "isn't available"), not in the feed, hashtags or `/sitemap.xml` | | |
| 9.2 | Sharing it (Share on the success screen) makes it appear in Everything | | |
| 9.3 | One-tap unsubscribe from an email turns off only that category | | |
