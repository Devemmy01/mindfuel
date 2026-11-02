/**
 * Product vocabulary. One verb for writing ("Reflect"), one noun for what is
 * written ("reflection"). Import strings from here instead of writing new
 * synonyms ("post", "thought", "share") so the app reads consistently.
 */
export const copy = {
  verb: "Reflect",
  noun: "reflection",
  nounPlural: "reflections",

  valueLine: "Write one honest reflection a day. Read what others learned.",

  nav: {
    home: "Home",
    search: "Search",
    write: "Reflect",
    writeLong: "Write a reflection",
    notifications: "Notifications",
    notificationsShort: "Alerts",
    messages: "Messages",
    saved: "Saved",
    profile: "Profile",
    signIn: "Sign in",
    joinFree: "Join free",
    unlockMore: "Sign in to unlock more",
    unlockMoreHint: "Save reflections, get replies, and keep your streak.",
    about: "About MindFuel",
    signOut: "Sign out",
  },

  feedTabs: {
    prompts: {
      label: "Prompt answers",
      description: "Reflections written in reply to a daily prompt. Today's prompt comes first.",
    },
    everything: {
      label: "Everything",
      description: "Every reflection and repost, with people you follow ranked higher.",
    },
  },

  composer: {
    title: "New reflection",
    submit: "Reflect",
    submitting: "Saving…",
    placeholder: "What did today teach you?",
    placeholderWithPrompt: "Write your reflection…",
    helper: "A sentence or two is enough.",
  },

  prompt: {
    cta: "Reflect on this",
  },

  empty: {
    feedTitle: "No reflections here yet",
    feedBody: "Follow people or write the first reflection.",
    promptsTitle: "Be the first to reflect today",
    promptsBody: "Your answer might be exactly what someone else needs to read.",
    notificationsTitle: "No notifications yet",
    notificationsBody: "When someone replies to, likes, or saves your reflections, you'll see it here.",
    caughtUp: "You're all caught up",
  },
} as const;
