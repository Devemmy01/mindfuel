"use client";

import { useEffect, useRef } from "react";

// Module-level Set persists across component mounts in the same JS session.
// This prevents duplicate API calls when the same post card renders multiple times
// (e.g. switching feed tabs, navigating back).
const sessionTracked = new Set<string>(
  typeof sessionStorage !== "undefined"
    ? JSON.parse(sessionStorage.getItem("tracked_views") || "[]")
    : []
);

function persistTracked() {
  try {
    sessionStorage.setItem("tracked_views", JSON.stringify([...sessionTracked]));
  } catch {
    // sessionStorage may be unavailable in some environments — safe to ignore
  }
}

interface UseViewTrackerOptions {
  postId: string;
  userId?: string | null;
  /** Milliseconds the post must remain in the viewport before the view is counted. Default: 1500 */
  threshold?: number;
  /** Disabled if false (e.g. for non-feed detail pages that track views differently). Default: true */
  enabled?: boolean;
}

/**
 * Tracks a post view only after the element has been visible in the viewport for
 * `threshold` ms. Uses:
 *  - A module-level Set to deduplicate within a JS session
 *  - sessionStorage for persistence across navigation
 *  - IntersectionObserver to avoid tracking posts the user scrolled past
 *
 * This dramatically reduces /api/posts/[id]/view invocations vs tracking on mount.
 */
export function useViewTracker(
  ref: React.RefObject<HTMLElement | null>,
  { postId, userId, threshold = 1500, enabled = true }: UseViewTrackerOptions
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || !postId) return;

    // Already tracked in this session — skip everything
    if (sessionTracked.has(postId)) return;

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          // Start a timer — only fire if the post stays visible
          timerRef.current = setTimeout(async () => {
            // Double-check we haven't already tracked while waiting
            if (sessionTracked.has(postId)) return;

            sessionTracked.add(postId);
            persistTracked();

            try {
              await fetch(`/api/posts/${postId}/view`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: userId ?? null }),
              });
            } catch {
              // Non-critical — silently ignore network errors
              sessionTracked.delete(postId);
            }
          }, threshold);
        } else {
          // User scrolled away before threshold elapsed — cancel the timer
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
        }
      },
      { threshold: 0.5 } // 50% of the card must be visible to start the timer
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [postId, userId, threshold, enabled, ref]);
}
