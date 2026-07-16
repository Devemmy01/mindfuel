# MindFuel

MindFuel is a personal growth network where people grow together through reflection. Instead of optimizing for endless scrolling, it helps members share lessons, answer thoughtful prompts, support one another, and return to a growing record of their personal development.

In simple terms: **MindFuel turns individual reflection into shared growth.**

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

## Live Product

Production domain used throughout the app:

```text
https://mind-fuel.app
```

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

### Private Messaging and Real-Time Chat

Members can start one-to-one conversations from profiles or the messages screen. Chat includes:

- Real-time message delivery through Socket.IO.
- MongoDB-backed conversation history and unread counts.
- Optimistic sends with sending and failure states.
- Typing indicators and conversation presence rooms.
- Delivered and seen receipts in messages and conversation previews.
- Emoji insertion and a responsive, auto-growing composer.
- Correct wrapping and scrolling for long messages.
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

The app uses React Email and Resend for branded emails, including daily tips, comment notifications, quote notifications, repost notifications, updates, reminders, and welcome-style messaging.

### Admin and Cron Workflows

The backend includes cron and admin routes for recurring product operations:

- Daily tip delivery.
- Daily prompt push notifications.
- Inactivity reminders.
- Tip synchronization.
- Admin update broadcasts.

## Feature Map

| Area | What It Does |
| --- | --- |
| Landing page | Explains MindFuel and routes authenticated users into the app |
| Feed | Community reflection discovery and engagement |
| Create | Reflection composer with prompts, styling, media, hashtags, polls, and quotes |
| Profile | User identity, bio, posts, milestones, and growth history |
| Connections | Followers, following, follow-back actions, and connection discovery |
| Messages | Private real-time chat, unread states, typing indicators, emoji, and seen receipts |
| Collections | Saved reflections and personal idea library |
| Search | User and content discovery |
| Hashtags | Topic-based reflection browsing |
| Notifications | In-app, push, and email-based updates |
| Offline page | PWA fallback experience |
| Cron jobs | Automated daily reminders, tips, and maintenance |

## Tech Stack

### Frontend

- **Next.js 15** with the App Router.
- **React 19** for component architecture.
- **TypeScript** for safer application code.
- **Tailwind CSS 4** for styling.
- **Framer Motion** for interface animation.
- **Lucide React** for icons.
- **SWR** for client-side data fetching.
- **Socket.IO Client** for live messaging, typing, and read-receipt events.

### Backend

- **Next.js Route Handlers** for API endpoints.
- **MongoDB** as the database.
- **Mongoose** for schemas, models, validation, and queries.
- **Firebase Authentication** for sign-in and user identity.
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

## Architecture Overview

MindFuel uses the Next.js App Router as both the frontend and backend boundary.

```text
User Browser
  |
  |-- React UI, PWA, Service Worker
  |
Next.js App Router
  |
  |-- Pages: feed, create, profile, messages, search, collections, hashtags
  |-- API Routes: posts, comments, follows, chat, saves, users, notifications, push, cron
  |-- Socket.IO: conversations, typing, message delivery, and seen receipts
  |
Data and Services
  |
  |-- MongoDB + Mongoose (durable posts, follows, conversations, and messages)
  |-- Redis adapter (cross-instance transient socket events)
  |-- Firebase Auth
  |-- Cloudinary
  |-- Resend
  |-- Web Push / VAPID
```

The frontend talks to internal API routes. API routes connect to MongoDB, validate user-related data, call third-party services when needed, and return JSON responses to the client.

## Important Directories

```text
app/
  Next.js pages, layouts, API routes, cron routes, and metadata routes.

src/components/
  Reusable UI and product components such as Navbar, PostCard, CardCreator,
  NotificationsList, ProfilePictureEditor, and onboarding components.

src/models/
  Mongoose schemas for users, posts, comments, likes, saves, reports,
  notifications, follows, conversations, messages, collections, hashtags,
  reposts, and tips.

src/lib/
  Shared product logic, integrations, notifications, milestones, prompts,
  push setup, SEO, utilities, and email service configuration.

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

Users are stored in MongoDB and linked to Firebase identity through `firebaseId`. A user includes profile information, notification preferences, push subscriptions, streak data, and earned milestones.

Key fields:

- `email`
- `name`
- `username`
- `image`
- `bio`
- `firebaseId`
- `preferences.dailyEmail`
- `preferences.notifications`
- `pushSubscriptions`
- `streakDays`
- `longestStreak`
- `earnedMilestones`

### Post

Posts are the core reflection object. A post can be plain text, styled, image-backed, hashtagged, prompt-linked, quoted, reposted, or poll-enabled.

Key fields:

- `text`
- `hashtags`
- `userId`
- `views`
- `likesCount`
- `commentsCount`
- `repostCount`
- `imageUrl`
- `backgroundStyle`
- `fontFamily`
- `promptId`
- `poll`
- `quotedPostId`
- `isRepost`
- `repostedBy`

### Notifications

Notifications connect user actions to recipients. They support both in-app notification records and optional push/email delivery.

### Follows

Follow records connect a follower to the person they follow. A compound unique index prevents duplicate relationships, while reverse lookups support follower counts, following counts, follow-back state, and connection lists.

### Conversations and Messages

Conversations use a stable participant key so the same two people share one thread. Messages reference their conversation and sender, keep a `readBy` list for seen receipts, and are indexed for chronological retrieval and unread aggregation.

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
| `/api/chat/conversations` | Conversation lookup and one-to-one thread creation |
| `/api/chat/messages` | Message history, sending, and read-state updates |
| `/api/notifications` | In-app notification retrieval and updates |
| `/api/push/config` | Public VAPID key delivery |
| `/api/push/subscribe` | Browser push subscription persistence |
| `/api/users/profile` | Current user profile |
| `/api/users/[id]` | Public user profile data |
| `/api/users/search` | User search |
| `/api/hashtags/*` | Hashtag search, pages, and trends |
| `/api/upload` | Cloudinary upload handling |
| `/api/reports` | Report submission |
| `/api/cron/*` | Scheduled jobs |
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

Open:

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

Note: the current `lint` script uses `next lint`. Depending on the installed Next.js version and CLI behavior, this may need to be updated to the modern ESLint command in the future.

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

## Vercel Cron Jobs

The project includes scheduled jobs:

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

These jobs power recurring engagement flows such as daily fuel emails and inactivity reminders.

## Security and Privacy Considerations

MindFuel handles user-generated content, profile data, authentication, emails, and push subscriptions. Important considerations include:

- Firebase manages authentication identity.
- MongoDB stores user profile and product data.
- Push subscriptions are stored per user and can become invalid over time.
- Cron and admin routes are protected by shared secrets.
- Uploads are handled through Cloudinary.
- User reports provide a moderation pathway.
- Privacy, terms, and cookie pages are present in the app.

## Technical Highlights

- Built a full-stack product with Next.js App Router and TypeScript.
- Designed MongoDB/Mongoose schemas for a social content platform.
- Implemented Firebase authentication with backend user synchronization.
- Built reflection creation, feeds, comments, likes, saves, reposts, and quote posts.
- Added follower/following relationships, follow-back actions, connection lists, and follower notifications.
- Built durable one-to-one messaging with realtime delivery, typing, unread counts, and seen receipts.
- Added hashtag discovery and trending hashtag support.
- Implemented streaks and milestone logic to encourage long-term habit formation.
- Added email workflows using React Email and Resend.
- Added PWA support with service workers, offline behavior, installability, and push notifications.
- Built scheduled cron workflows for recurring engagement.
- Integrated Cloudinary uploads for user media.
- Added SEO-oriented pages and metadata support.
- Improved responsive navigation, profile actions, landing-page routing, chat composition, and PWA UI polish.

## Product Philosophy

MindFuel is not trying to be the loudest social platform. It is trying to be the most useful place to think out loud.

The product is built around a simple belief: when people reflect consistently, they become more aware of what they are learning, how they are changing, and what kind of life they are building.

## Current Status

MindFuel is an active full-stack application with production-oriented features, including authentication, database persistence, media uploads, follower relationships, realtime private messaging, notifications, PWA behavior, email delivery, cron jobs, and social engagement flows.

## Future Improvements

Potential next steps include:

- Richer privacy controls for public, private, and followers-only reflections.
- Better moderation tools for reports and content review.
- Analytics dashboards for reflection streaks and growth patterns.
- Connection privacy controls and richer personalized-feed ranking.
- AI-assisted reflection suggestions.
- Exportable personal journal archive.
- More advanced collections and tagging.
- Mobile app wrapper using the existing PWA foundation.

## Real-Time Chat

MindFuel uses Socket.IO on the same host as the web app. Locally, `npm run dev`
boots Next.js and Socket.IO together. On Vercel, `api/socket.ts` is deployed as
a WebSocket-capable Vercel Function, so no second application host or
`NEXT_PUBLIC_SOCKET_URL` is required.

Because connected clients can land on different Vercel Function instances,
add an Upstash Redis integration from the Vercel Marketplace and expose its
connection string as `REDIS_URL`. Redis relays transient live events between
instances; MongoDB remains the durable source of truth for conversations and
messages. The HTTP API keeps chat history usable during socket reconnects.

Chat events are authorized against conversation membership before a socket can
join a room or publish a message. MongoDB remains authoritative for message
history and read state; Socket.IO carries immediate delivery, typing, and seen
events. Recipients with an active app connection receive realtime UI updates,
hidden tabs can show browser notifications, and recipients with no live socket
can receive web push on registered devices.

## PWA Behavior

The landing page includes an intentional install section and the signed-in app
keeps an install action in the account/profile menus. Installed sessions always
launch at `/feed`. The automatic in-app invitation waits until the third app
visit and 45 seconds of engagement, appears at most once per browser session,
and stays dismissed for 30 days. Dismissing it never removes the manual install
actions.
