"use client";

import React from "react";
import { Bell } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useShellData } from "@/components/shell/useShellData";
import MessagesShortcut from "@/components/shell/MessagesShortcut";
import NotificationsList from "@/components/NotificationsList";
import EmptyState from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy";

export default function NotificationsPage() {
  const { user, loading, openSignInModal } = useAuth();
  const { notifications, unreadCount, notificationsLoading, markAllAsRead } = useShellData();

  // Opening the list counts as reading it, matching the previous popover.
  const markedRef = React.useRef(false);
  React.useEffect(() => {
    if (markedRef.current || notificationsLoading || unreadCount === 0) return;
    markedRef.current = true;
    const timer = window.setTimeout(() => void markAllAsRead(), 1200);
    return () => window.clearTimeout(timer);
  }, [markAllAsRead, notificationsLoading, unreadCount]);

  return (
    <div className="mobile-content-offset">
      <header className="sticky top-0 z-sticky flex h-14 items-center justify-between border-b border-line bg-background/90 px-4 backdrop-blur-md">
        <h1 className="text-h3">{copy.nav.notifications}</h1>
        <MessagesShortcut className="-mr-2" />
      </header>
      {!loading && !user ? (
        <EmptyState
          icon={Bell}
          title="Sign in to see your notifications"
          description="Replies, likes and new followers on your reflections show up here."
          action={<Button onClick={openSignInModal}>{copy.nav.signIn}</Button>}
        />
      ) : (
        <NotificationsList
          notifications={notifications}
          onMarkRead={markAllAsRead}
          isLoading={loading || notificationsLoading}
          currentUserId={user?.uid}
        />
      )}
    </div>
  );
}
