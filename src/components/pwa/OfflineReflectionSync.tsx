"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { useSubmitReflection } from "@/hooks/useSubmitReflection";
import { loadDraft } from "@/lib/draft";
import { track } from "@/lib/analytics";

/** Posts a reflection that was saved while offline, once, when the connection returns. */
export default function OfflineReflectionSync() {
  const { user, loading } = useAuth();
  const { showToast } = useToast();
  const syncing = useRef(false);
  const { save } = useSubmitReflection(() => {
    track("offline_post_synced");
    showToast("You're back online. Your reflection was posted.", "success", 5000);
  });

  const sync = useCallback(async () => {
    if (loading || !user || syncing.current || !navigator.onLine) return;
    const draft = loadDraft();
    if (!draft?.queuedOffline) return;
    syncing.current = true;
    try {
      await save({ text: draft.text, prompt: draft.prompt, promptId: draft.promptId, visibility: draft.visibility || "private" });
    } finally {
      syncing.current = false;
    }
  }, [loading, save, user]);

  useEffect(() => {
    void sync();
    const onVisible = () => {
      if (document.visibilityState === "visible") void sync();
    };
    window.addEventListener("online", sync);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", sync);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [sync]);

  return null;
}
