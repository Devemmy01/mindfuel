"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/providers/AuthProvider";
import { getSocket } from "@/lib/socket";

type PresenceContextValue = {
  isOnline: (userId?: string) => boolean;
  watchUsers: (userIds: string[]) => void;
};

const PresenceContext = createContext<PresenceContextValue>({
  isOnline: () => false,
  watchUsers: () => undefined,
});

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const watchedUserIdsRef = useRef<Set<string>>(new Set());

  const requestUsers = useCallback((userIds: string[]) => {
    if (!user || !userIds.length) return;
    const socket = getSocket(user.uid);
    for (let index = 0; index < userIds.length; index += 200) {
      socket.emit("presence:query", userIds.slice(index, index + 200));
    }
  }, [user]);

  const requestSnapshot = useCallback(() => {
    requestUsers(Array.from(watchedUserIdsRef.current));
  }, [requestUsers]);

  const watchUsers = useCallback(
    (userIds: string[]) => {
      const added: string[] = [];
      for (const userId of userIds) {
        if (!userId || userId === user?.uid || watchedUserIdsRef.current.has(userId)) continue;
        watchedUserIdsRef.current.add(userId);
        added.push(userId);
      }
      requestUsers(added);
    },
    [requestUsers, user?.uid],
  );

  useEffect(() => {
    if (!user) {
      watchedUserIdsRef.current.clear();
      setOnlineUserIds(new Set());
      return;
    }
    const socket = getSocket(user.uid);
    const onPresenceUpdate = ({ userId, online }: { userId?: string; online?: boolean }) => {
      if (!userId || !watchedUserIdsRef.current.has(userId)) return;
      setOnlineUserIds((current) => {
        const next = new Set(current);
        if (online) next.add(userId);
        else next.delete(userId);
        return next;
      });
    };
    const onPresenceSnapshot = (presence: Record<string, boolean>) => {
      setOnlineUserIds((current) => {
        const next = new Set(current);
        for (const [userId, online] of Object.entries(presence || {})) {
          if (online) next.add(userId);
          else next.delete(userId);
        }
        return next;
      });
    };
    socket.on("presence:update", onPresenceUpdate);
    socket.on("presence:snapshot", onPresenceSnapshot);
    socket.on("connect", requestSnapshot);
    requestSnapshot();
    return () => {
      socket.off("presence:update", onPresenceUpdate);
      socket.off("presence:snapshot", onPresenceSnapshot);
      socket.off("connect", requestSnapshot);
    };
  }, [requestSnapshot, user]);

  const value = useMemo<PresenceContextValue>(
    () => ({
      isOnline: (userId?: string) => Boolean(userId && (userId === user?.uid || onlineUserIds.has(userId))),
      watchUsers,
    }),
    [onlineUserIds, user?.uid, watchUsers],
  );

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}

export function usePresence(userIds: string[]) {
  const { isOnline, watchUsers } = useContext(PresenceContext);
  const stableIds = useMemo(
    () => Array.from(new Set(userIds.filter(Boolean))).sort(),
    // The joined value keeps equivalent arrays stable for callers that derive IDs while rendering.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userIds.join("\u0000")],
  );

  useEffect(() => {
    watchUsers(stableIds);
  }, [stableIds, watchUsers]);

  return isOnline;
}
