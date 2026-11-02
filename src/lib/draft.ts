/**
 * The one in-progress reflection, kept in localStorage so text survives a
 * sign-in redirect, a reload, or moving from the home composer to /create.
 * Drafts never leave the device.
 */
export type ReflectionDraft = {
  text: string;
  prompt?: string | null;
  promptId?: string | null;
  visibility?: "private" | "public";
  savedAt: number;
  /** Set when the draft should be submitted automatically after sign-in. */
  submitAfterSignIn?: boolean;
  /** Saved while offline; posted by OfflineReflectionSync on reconnect. */
  queuedOffline?: boolean;
};

const KEY = "mindfuel:draft:v1";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function loadDraft(): ReflectionDraft | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as ReflectionDraft;
    if (typeof draft?.text !== "string" || Date.now() - (draft.savedAt || 0) > MAX_AGE_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

export function saveDraft(draft: Omit<ReflectionDraft, "savedAt">) {
  try {
    if (!draft.text.trim()) {
      localStorage.removeItem(KEY);
      return;
    }
    localStorage.setItem(KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch {
    // Storage full or blocked: the text stays in memory for this page.
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
