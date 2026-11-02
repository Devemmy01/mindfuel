"use client";

import React from "react";
import { Bell, CheckCheck } from "lucide-react";
import { usePullToRefresh } from "@/lib/usePullToRefresh";
import { useAuth } from "@/providers/AuthProvider";
import { useShellData } from "@/components/shell/useShellData";
import MessagesShortcut from "@/components/shell/MessagesShortcut";
import NotificationsList from "@/components/NotificationsList";
import EmptyState from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy";

export default function NotificationsPage() {
  const { user, loading, openSignInModal } = useAuth();
  const { notifications, unreadCount, notificationsLoading, markAllAsRead, refreshNotifications } = useShellData();

  const { containerRef, pullDistance, isRefreshing } = usePullToRefresh({
    onRefresh: async () => {
      await refreshNotifications();
    },
  });

  return (
    <div ref={containerRef} className="mobile-content-offset">
      {pullDistance > 8 || isRefreshing ? (
        <p className="py-2 text-center text-caption text-muted-foreground" aria-live="polite">
          {isRefreshing ? "Refreshing…" : "Release to refresh"}
        </p>
      ) : null}
      <header className="sticky top-0 z-sticky flex h-14 items-center justify-between border-b border-line bg-background/90 px-4 backdrop-blur-md">
        <h1 className="text-h3">{copy.nav.notifications}</h1>
        <div className="-mr-2 flex items-center">
          {unreadCount > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => void markAllAsRead()}>
              <CheckCheck aria-hidden /> Mark all read
            </Button>
          ) : null}
          <MessagesShortcut />
        </div>
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
