"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { clearDraft, loadDraft, saveDraft } from "@/lib/draft";
import { recordFirstReflection, track } from "@/lib/analytics";
import type { PostVisibility } from "@/lib/post-visibility";
import type { PostType } from "@/types";

export type ReflectionInput = {
  text: string;
  prompt?: string | null;
  promptId?: string | null;
  visibility: PostVisibility;
  /** Extra fields for the full composer (image, quote, style). */
  extra?: Record<string, unknown>;
};

export type ReflectionSaved = {
  post: PostType & { visibility?: PostVisibility };
  streak: { streakDays: number; longestStreak: number };
  newMilestones: Array<{ id: string; label: string; emoji: string; description: string; tier: string }>;
  firstReflection: boolean;
};

type Status = "idle" | "signing-in" | "saving" | "error";

const SIGN_IN_ERRORS = {
  "popup-blocked": "Your browser blocked the sign-in window. Allow pop-ups for MindFuel, then try again. Your reflection is saved here.",
  cancelled: "Sign-in was cancelled. Your reflection is still here whenever you're ready.",
  network: "We couldn't reach Google. Check your connection and try again. Your reflection is still here.",
  unknown: "Sign-in didn't complete. Your reflection is still here. Please try again.",
} as const;

export function composeText(text: string, prompt?: string | null) {
  return prompt ? `Reflecting on: "${prompt}"\n\n${text}` : text;
}

// One auto-submit per page load, even if several composers are mounted.
let autoSubmitClaimed = false;

/**
 * Saves a reflection, signing the person in first when needed. The text is
 * never lost: it stays in the local draft until the server confirms the save.
 */
export function useSubmitReflection(onSaved: (result: ReflectionSaved) => void) {
  const { user, loading, signInWithGoogle } = useAuth();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  const save = useCallback(async (input: ReflectionInput): Promise<boolean> => {
    setStatus("saving");
    setError(null);
    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backgroundStyle: { id: "obsidian", type: "color", value: "#0a0a0a", text: "#ffffff" },
          fontFamily: "inter",
          ...input.extra,
          text: composeText(input.text.trim(), input.prompt),
          promptId: input.promptId || undefined,
          visibility: input.visibility,
        }),
      });
      if (!response.ok) throw new Error(`Save failed with ${response.status}`);
      const data = (await response.json()) as ReflectionSaved;
      clearDraft();
      setStatus("idle");
      track("post_success", { visibility: input.visibility, withPrompt: Boolean(input.promptId) });
      if (data.firstReflection) {
        recordFirstReflection();
        track("post_success_first", { visibility: input.visibility });
      }
      onSavedRef.current(data);
      return true;
    } catch (failure) {
      console.error("Reflection save failed", failure);
      saveDraft({ text: input.text, prompt: input.prompt, promptId: input.promptId, visibility: input.visibility });
      setStatus("error");
      setError("We couldn't save your reflection. Your text is safe here. Please try again.");
      track("post_failed");
      return false;
    }
  }, []);

  const submit = useCallback(async (input: ReflectionInput) => {
    if (!input.text.trim()) return false;
    if (user) return save(input);

    // Guests: keep the draft with an intent flag, then sign in. If the page
    // reloads mid-flow, the effect below finishes the job exactly once.
    saveDraft({ text: input.text, prompt: input.prompt, promptId: input.promptId, visibility: input.visibility, submitAfterSignIn: true });
    track("post_attempt_guest");
    track("signin_shown", { source: "composer" });
    setStatus("signing-in");
    setError(null);
    // Claim the submit before signing in: the user state changes during
    // sign-in, and the resume effect below must not post a second copy.
    autoSubmitClaimed = true;
    const result = await signInWithGoogle();
    if (!result.ok) {
      autoSubmitClaimed = false;
      saveDraft({ text: input.text, prompt: input.prompt, promptId: input.promptId, visibility: input.visibility });
      setStatus("error");
      setError(SIGN_IN_ERRORS[result.reason]);
      track("signin_failed", { reason: result.reason });
      return false;
    }
    track("signin_success", { source: "composer" });
    return save(input);
  }, [save, signInWithGoogle, user]);

  // Finish a guest submit that was interrupted by a reload after sign-in.
  useEffect(() => {
    if (loading || !user || autoSubmitClaimed) return;
    const draft = loadDraft();
    if (!draft?.submitAfterSignIn) return;
    autoSubmitClaimed = true;
    // Clear the flag before saving so a crash cannot cause a second post.
    saveDraft({ text: draft.text, prompt: draft.prompt, promptId: draft.promptId, visibility: draft.visibility });
    void save({
      text: draft.text,
      prompt: draft.prompt,
      promptId: draft.promptId,
      visibility: draft.visibility || "private",
    });
  }, [loading, save, user]);

  return {
    submit,
    status,
    error,
    busy: status === "signing-in" || status === "saving",
    clearError: () => {
      setError(null);
      setStatus("idle");
    },
  };
}
