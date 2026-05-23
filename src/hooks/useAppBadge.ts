"use client";

import { useEffect } from "react";

type BadgingNavigator = Navigator & {
  setAppBadge?: (contents?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

/**
 * Custom hook to update the installed PWA application badge
 * with the user's current streak days.
 */
export function useAppBadge(streakDays: number) {
  useEffect(() => {
    const badgingNavigator = navigator as BadgingNavigator;

    // Check if the experimental App Badging API is supported
    if (typeof navigator !== "undefined" && badgingNavigator.setAppBadge) {
      const setBadge = async () => {
        try {
          if (streakDays > 0) {
            await badgingNavigator.setAppBadge(streakDays);
          } else {
            await badgingNavigator.clearAppBadge?.();
          }
        } catch (err) {
          console.error("Failed to update PWA badge:", err);
        }
      };

      setBadge();
    }
  }, [streakDays]);

  // Also clear the badge when the user opens/returns to the app
  useEffect(() => {
    const badgingNavigator = navigator as BadgingNavigator;

    if (typeof navigator !== "undefined" && badgingNavigator.clearAppBadge) {
      const clearBadge = async () => {
        try {
          await badgingNavigator.clearAppBadge?.();
        } catch (err) {
          console.error("Failed to clear PWA badge:", err);
        }
      };

      // Clear immediately on mount
      clearBadge();

      // Clear when the document becomes visible again
      const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          clearBadge();
        }
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);
      return () => {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      };
    }
  }, []);
}
