"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useAppBadge } from "@/hooks/useAppBadge";

/**
 * A client-only side-effect component that fetches the active
 * user's streakDays from the auth context and keeps the PWA
 * launcher badge synchronized.
 */
export default function ClientBadgeUpdater() {
  const { profile } = useAuth();
  
  // Update badge with user streak count
  useAppBadge(profile?.streakDays || 0);

  return null;
}
