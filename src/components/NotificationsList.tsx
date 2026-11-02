"use client";

import React from "react";
import Link from "next/link";
import { differenceInCalendarDays, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import Image from "next/image";
import { MessageCircle, Heart, BellOff, UserPlus, Loader2, UserCheck } from "lucide-react";
import useSWR from "swr";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import { copy } from "@/lib/copy";

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
  /** With an id, marks that notification read; without, marks all. */
  onMarkRead: (id?: string) => void;
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
        body: JSON.stringify({ followingId: notification.sender.firebaseId }),
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
      className={`ml-auto flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full px-3 text-[12px] font-bold transition-colors disabled:opacity-60 ${isFollowing ? "border border-line bg-surface-elevated text-foreground" : "bg-primary text-primary-foreground hover:bg-primary-hover"}`}
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

const VERB: Record<AppNotification["type"], string> = {
  follow: "followed you",
  like: "liked your reflection",
  save: "saved your reflection",
  repost: "reposted your reflection",
  quote: "quoted your reflection",
  comment: "replied to your reflection",
  reply: "replied to your comment",
};

function dayGroup(date: Date) {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  if (differenceInCalendarDays(new Date(), date) < 7) return "Earlier this week";
  return "Earlier";
}

function TypeBadge({ type }: { type: AppNotification["type"] }) {
  const Icon = type === "like" || type === "save" ? Heart : type === "follow" ? UserPlus : MessageCircle;
  return (
    <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full border-2 border-background bg-surface-elevated text-foreground">
      <Icon className="size-2.5" aria-hidden />
    </span>
  );
}

export default function NotificationsList({ notifications, onMarkRead, isLoading, onClose, currentUserId }: NotificationsListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 py-4" aria-busy="true" aria-label="Loading notifications">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3 px-4">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <EmptyState
        icon={BellOff}
        title={copy.empty.notificationsTitle}
        description={copy.empty.notificationsBody}
        action={
          <Link href="/create" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            Write a reflection
          </Link>
        }
      />
    );
  }

  const groups: Array<{ label: string; items: AppNotification[] }> = [];
  for (const notification of notifications) {
    if (!notification.sender) continue;
    const label = dayGroup(new Date(notification.createdAt));
    const group = groups[groups.length - 1];
    if (group?.label === label) group.items.push(notification);
    else groups.push({ label, items: [notification] });
  }

  return (
    <div className="flex w-full flex-col">
      {groups.map((group) => (
        <section key={group.label} aria-label={group.label}>
          <h2 className="px-4 pb-1 pt-4 text-micro font-semibold uppercase tracking-wider text-subtle-foreground">{group.label}</h2>
          <ul>
            {group.items.map((notification) => {
              const href = notification.type === "follow"
                ? `/profile/${notification.sender.firebaseId}`
                : `/post/${notification.postId?._id}`;
              return (
                <li key={notification._id} className={`relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/50 ${notification.isRead ? "" : "bg-primary/[0.04]"}`}>
                  {!notification.isRead ? (
                    <span className="absolute left-1.5 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-primary" aria-hidden />
                  ) : null}
                  <Link
                    href={href}
                    onClick={() => {
                      if (!notification.isRead) onMarkRead(notification._id);
                      onClose?.();
                    }}
                    className="flex min-w-0 flex-1 gap-3"
                  >
                    <span className="relative shrink-0">
                      <NotificationAvatar sender={notification.sender} />
                      <TypeBadge type={notification.type} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-body-sm leading-snug">
                        {!notification.isRead ? <span className="sr-only">Unread: </span> : null}
                        <span className="font-semibold text-foreground">{notification.sender.name}</span>{" "}
                        <span className="text-muted-foreground">{VERB[notification.type] || "interacted with your reflection"}</span>
                      </span>
                      {notification.postId?.text ? (
                        <span className="mt-0.5 block truncate text-caption text-subtle-foreground">
                          &ldquo;{notification.postId.text.replace(/^Reflecting on: "[^"]*"\s*/, "")}&rdquo;
                        </span>
                      ) : null}
                      <time dateTime={notification.createdAt} className="mt-1 block text-micro text-subtle-foreground">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </time>
                    </span>
                  </Link>
                  {notification.type === "follow" ? (
                    <FollowBackButton notification={notification} currentUserId={currentUserId} />
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
