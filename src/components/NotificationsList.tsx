"use client";

import React from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import { MessageCircle, Heart, BellOff, UserPlus, Loader2, UserCheck } from "lucide-react";
import useSWR from "swr";
import Skeleton from "@/components/ui/Skeleton";

type CachedFollowState = {
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  followsViewer: boolean;
};

const cachedFollowStateFetcher = async (url: string): Promise<CachedFollowState> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Could not load follow status");
  const data = await response.json();
  return {
    followersCount: data.followersCount || 0,
    followingCount: data.followingCount || 0,
    isFollowing: Boolean(data.isFollowing),
    followsViewer: Boolean(data.followsViewer),
  };
};

export interface AppNotification {
  _id: string;
  type: "like" | "comment" | "reply" | "repost" | "quote" | "save" | "follow";
  sender: {
    name: string;
    image?: string;
    username?: string;
    firebaseId: string;
  };
  postId?: {
    _id: string;
    text: string;
  };
  isRead: boolean;
  createdAt: string;
  isFollowingSender?: boolean;
}

interface NotificationsListProps {
  notifications: AppNotification[];
  onMarkRead: () => void;
  isLoading: boolean;
  onClose?: () => void;
  currentUserId?: string;
}

function FollowBackButton({ notification, currentUserId }: { notification: AppNotification; currentUserId?: string }) {
  const [isLoading, setIsLoading] = React.useState(false);
  const followStateKey = currentUserId
    ? `/api/follows?profileId=${notification.sender.firebaseId}&viewerId=${currentUserId}`
    : null;
  const fallbackState: CachedFollowState = {
    followersCount: 0,
    followingCount: 0,
    isFollowing: Boolean(notification.isFollowingSender),
    followsViewer: true,
  };
  const { data: followState = fallbackState, mutate: mutateFollowState } = useSWR<CachedFollowState>(
    followStateKey,
    cachedFollowStateFetcher,
    {
      fallbackData: fallbackState,
      dedupingInterval: 60_000,
      revalidateOnFocus: true,
    },
  );
  const isFollowing = followState.isFollowing;

  const toggleFollow = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!currentUserId || isLoading) return;

    setIsLoading(true);
    const previous = followState;
    const optimistic = { ...followState, isFollowing: !isFollowing };
    mutateFollowState(optimistic, false);
    try {
      const response = await fetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followerId: currentUserId, followingId: notification.sender.firebaseId }),
      });
      if (!response.ok) throw new Error("Follow failed");
      const data = await response.json();
      mutateFollowState({ ...optimistic, isFollowing: Boolean(data.isFollowing) }, false);
    } catch {
      mutateFollowState(previous, false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggleFollow}
      disabled={isLoading || !currentUserId}
      className={`ml-auto flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full px-3 text-[12px] font-bold transition-colors disabled:opacity-60 ${isFollowing ? "border border-border bg-secondary text-foreground" : "bg-[#038142] text-white hover:bg-[#03944b]"}`}
      aria-label={isFollowing ? `Unfollow ${notification.sender.name}` : `Follow back ${notification.sender.name}`}
    >
      {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isFollowing ? <UserCheck className="h-3.5 w-3.5" /> : null}
      {isFollowing ? "Following" : "Follow back"}
    </button>
  );
}

function NotificationAvatar({ sender }: { sender: AppNotification["sender"] }) {
  const [imgError, setImgError] = React.useState(false);
  
  if (sender.image && !sender.image.startsWith("#") && !imgError) {
    return (
      <Image
        src={sender.image}
        alt={sender.name}
        width={40}
        height={40}
        onError={() => setImgError(true)}
        className="w-10 h-10 rounded-full object-cover ring-1 ring-border"
      />
    );
  }
  
  return (
    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-[13px] text-muted-foreground ring-1 ring-border">
      {sender.name?.[0]?.toUpperCase() || "U"}
    </div>
  );
}

export default function NotificationsList({ notifications, onMarkRead, isLoading, onClose, currentUserId }: NotificationsListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 py-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 px-4">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 rounded w-3/4" />
              <Skeleton className="h-3 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-secondary/40 flex items-center justify-center mb-3">
          <BellOff className="w-6 h-6 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <p className="font-bold text-[15px]">No notifications yet</p>
        <p className="text-muted-foreground text-[13px] max-w-[180px]">
          We&apos;ll notify you here when someone likes or comments on your thoughts.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full md:h-[350px] overflow-y-auto scrollbar-hide">
      {notifications.map((notification) => {
        if (!notification.sender) return null;

        return (
          <div
            key={notification._id}
            className={`relative flex w-full items-center gap-3 border-b border-border/40 px-4 py-3.5 transition-colors last:border-none hover:bg-secondary/40
            ${!notification.isRead ? "bg-brand-green/[0.03]" : ""}
          `}
          >
            {/* Unread indicator */}
            {!notification.isRead && (
              <div className="absolute left-1 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-brand-green shadow-[0_0_8px_var(--brand-green)]" />
            )}

            <Link
              href={
                notification.type === "follow"
                  ? `/profile/${notification.sender.firebaseId}`
                  : `/post/${notification.postId?._id}`
              }
              onClick={() => {
                if (!notification.isRead) onMarkRead();
                if (onClose) onClose();
              }}
              className="flex min-w-0 flex-1 gap-3"
            >
              <div className="relative shrink-0">
                <NotificationAvatar sender={notification.sender} />
                <div className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-popover shadow-sm ${notification.type === "like" ? "bg-rose-500" : "bg-blue-500"}`}>
                  {notification.type === "like" ? (
                    <Heart className="h-2.5 w-2.5 fill-current text-white" />
                  ) : notification.type === "follow" ? (
                    <UserPlus className="h-2.5 w-2.5 text-white" />
                  ) : (
                    <MessageCircle className="h-2.5 w-2.5 fill-current text-white" />
                  )}
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] leading-snug">
                  <span className="font-bold text-foreground">{notification.sender.name}</span>{" "}
                  <span className="text-muted-foreground">
                    {notification.type === "follow" ? "followed you" : notification.type === "like" ? "liked your thought" : notification.type === "repost" ? "reposted your thought" : notification.type === "quote" ? "quoted your thought" : "commented on your thought"}
                  </span>
                </p>
                {notification.postId?.text && (
                  <p className="mt-0.5 max-w-[200px] truncate text-[12.5px] italic text-muted-foreground/60">
                    &ldquo;{notification.postId.text}&rdquo;
                  </p>
                )}
                <span className="mt-1 block text-[11px] font-medium text-muted-foreground/50">
                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                </span>
              </div>
            </Link>
            {notification.type === "follow" && (
              <FollowBackButton notification={notification} currentUserId={currentUserId} />
            )}
          </div>
        );
      })}
    </div>
  );
}
