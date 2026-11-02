"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { getSocket } from "@/lib/socket";
import { chatFetch } from "@/lib/chat-api";
import type { AppNotification } from "@/components/NotificationsList";

type NavMessage = {
  _id?: string;
  text?: string;
  createdAt?: string;
  sender?: { firebaseId?: string; name?: string; image?: string };
};

type NavConversation = {
  _id: string;
  unreadCount?: number;
  lastMessage?: NavMessage;
  lastMessageAt?: string;
};

type NotificationsPayload = { notifications: AppNotification[]; unreadCount: number } | null;

function useShellDataSource() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const pathname = usePathname();
  const chatMessageIdsRef = useRef<Map<string, string>>(new Map());
  const chatSnapshotReadyRef = useRef(false);
  const [notificationsReady, setNotificationsReady] = useState(false);

  const { data: chatConversationData, mutate: mutateChatConversations } = useSWR<NavConversation[]>(
    user ? "/api/chat/conversations" : null,
    async (url: string) => {
      if (!user) return [];
      const response = await chatFetch(user, url, { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load unread messages");
      return (await response.json()).conversations || [];
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      shouldRetryOnError: false,
      refreshInterval: 0,
      refreshWhenHidden: false,
      dedupingInterval: 2_000,
    },
  );
  const conversations = chatConversationData || [];
  const unreadMessageCount = conversations.reduce(
    (total, conversation) => total + (conversation.unreadCount || 0),
    0,
  );

  useEffect(() => {
    if (!user) return;
    const socket = getSocket(user.uid);
    const onMessage = ({ conversationId, conversation, message }: {
      conversationId?: string;
      conversation?: NavConversation;
      message?: NavMessage;
    }) => {
      if (!message || !conversationId || pathname.startsWith("/messages")) return;
      void mutateChatConversations((rows = []) => {
        const existing = rows.find((row) => row._id === conversationId);
        const updated: NavConversation = {
          ...(existing || conversation || { _id: conversationId }),
          lastMessage: message,
          lastMessageAt: message.createdAt,
          unreadCount: (existing?.unreadCount || 0) + 1,
        };
        return [updated, ...rows.filter((row) => row._id !== conversationId)];
      }, { revalidate: false });
    };
    socket.on("conversation:message", onMessage);
    return () => {
      socket.off("conversation:message", onMessage);
    };
  }, [pathname, user, mutateChatConversations]);

  useEffect(() => {
    if (!user || !chatConversationData) return;
    const nextIds = new Map<string, string>();
    for (const conversation of chatConversationData) {
      const message = conversation.lastMessage;
      if (!message?._id) continue;
      nextIds.set(conversation._id, message._id);
      const previousId = chatMessageIdsRef.current.get(conversation._id);
      if (
        chatSnapshotReadyRef.current &&
        previousId !== message._id &&
        message.sender?.firebaseId !== user.uid &&
        !pathname.startsWith("/messages")
      ) {
        const firstName = (message.sender?.name || "Someone").trim().split(/\s+/)[0] || "Someone";
        showToast(`New message from ${firstName}`, "info", 5000);
      }
    }
    chatMessageIdsRef.current = nextIds;
    chatSnapshotReadyRef.current = true;
  }, [chatConversationData, pathname, showToast, user]);

  // Defer the first notifications request so it never competes with the
  // first paint of the page the user actually opened.
  useEffect(() => {
    if (!user) {
      setNotificationsReady(false);
      return;
    }
    const timer = window.setTimeout(() => setNotificationsReady(true), 1000);
    return () => window.clearTimeout(timer);
  }, [user]);

  const { data: notifData, mutate: mutateNotifications } = useSWR<NotificationsPayload>(
    user && notificationsReady ? `/api/notifications?userId=${user.uid}` : null,
    (url: string) => fetch(url).then((response) => (response.ok ? response.json() : null)).catch(() => null),
    {
      refreshInterval: 120_000,
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      revalidateOnFocus: true,
      dedupingInterval: 30_000,
    },
  );

  const notifications = React.useMemo(() => notifData?.notifications ?? [], [notifData]);
  const unreadCount = notifData?.unreadCount ?? 0;

  // A push arrived while the app is open: refresh counts now.
  useEffect(() => {
    const refresh = () => {
      void mutateNotifications();
      void mutateChatConversations();
    };
    window.addEventListener("mindfuel:push-received", refresh);
    return () => window.removeEventListener("mindfuel:push-received", refresh);
  }, [mutateChatConversations, mutateNotifications]);

  // App icon badge = unread notifications + unread messages (installed apps).
  useEffect(() => {
    const badging = navigator as Navigator & {
      setAppBadge?: (count?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (!badging.setAppBadge) return;
    const total = user ? unreadCount + unreadMessageCount : 0;
    (total > 0 ? badging.setAppBadge(total) : badging.clearAppBadge?.())?.catch(() => undefined);
  }, [unreadCount, unreadMessageCount, user]);

  /** Marks one notification read (by id), or all of them. */
  const markAllAsRead = useCallback(async (id?: string) => {
    if (!user || unreadCount === 0) return;
    try {
      await mutateNotifications(
        {
          notifications: notifications.map((notification) =>
            !id || notification._id === id ? { ...notification, isRead: true } : notification,
          ),
          unreadCount: id ? Math.max(0, unreadCount - 1) : 0,
        },
        false,
      );
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id ? { id } : {}),
      });
    } catch (error) {
      console.error("Failed to mark notifications as read", error);
      void mutateNotifications();
    }
  }, [mutateNotifications, notifications, unreadCount, user]);

  return {
    conversationCount: conversations.length,
    unreadMessageCount,
    notifications,
    unreadCount,
    notificationsLoading: Boolean(user) && notifData === undefined,
    markAllAsRead,
    refreshNotifications: () => mutateNotifications(),
  };
}

type ShellData = ReturnType<typeof useShellDataSource>;

const ShellDataContext = createContext<ShellData | null>(null);

/**
 * Unread counts and notification data shared by the desktop rail, the mobile
 * tab bar and the notifications page. Mounted once so the socket listener and
 * "new message" toasts never run twice.
 */
export function ShellDataProvider({ children }: { children: React.ReactNode }) {
  const value = useShellDataSource();
  return React.createElement(ShellDataContext.Provider, { value }, children);
}

export function useShellData(): ShellData {
  const value = useContext(ShellDataContext);
  if (!value) throw new Error("useShellData must be used inside ShellDataProvider");
  return value;
}
