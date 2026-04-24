"use client";

import React from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import { MessageCircle, Heart, BellOff } from "lucide-react";

export interface AppNotification {
  _id: string;
  type: "like" | "comment" | "reply";
  sender: {
    name: string;
    image?: string;
    username?: string;
    firebaseId: string;
  };
  postId: {
    _id: string;
    text: string;
  };
  isRead: boolean;
  createdAt: string;
}

interface NotificationsListProps {
  notifications: AppNotification[];
  onMarkRead: () => void;
  isLoading: boolean;
  onClose?: () => void;
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

export default function NotificationsList({ notifications, onMarkRead, isLoading, onClose }: NotificationsListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 py-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 px-4 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-secondary/60" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-secondary/60 rounded w-3/4" />
              <div className="h-3 bg-secondary/60 rounded w-1/4" />
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
    <div className="flex flex-col w-full h-[350px] overflow-y-auto scrollbar-hide">
      {notifications.map((notification) => {
        if (!notification.postId || !notification.sender) return null;

        return (
          <Link
            key={notification._id}
            href={`/post/${notification.postId._id}`}
            onClick={() => {
              if (!notification.isRead) onMarkRead();
              if (onClose) onClose();
            }}
          className={`flex w-full gap-3 px-4 py-3.5 hover:bg-secondary/40 transition-colors border-b border-border/40 last:border-none relative
            ${!notification.isRead ? "bg-brand-green/[0.03]" : ""}
          `}
        >
          {/* Unread indicator */}
          {!notification.isRead && (
            <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-brand-green shadow-[0_0_8px_var(--brand-green)]" />
          )}

          {/* Avatar */}
          <div className="shrink-0 relative">
            <NotificationAvatar sender={notification.sender} />
            
            {/* Secondary Icon */}
            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-popover shadow-sm
              ${notification.type === "like" ? "bg-rose-500" : "bg-blue-500"}
            `}>
              {notification.type === "like" ? (
                <Heart className="w-2.5 h-2.5 text-white fill-current" />
              ) : (
                <MessageCircle className="w-2.5 h-2.5 text-white fill-current" />
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[13.5px] leading-snug">
              <span className="font-bold text-foreground">{notification.sender.name}</span>{" "}
              <span className="text-muted-foreground">
                {notification.type === "like" ? "liked your thought" : "commented on your thought"}
              </span>
            </p>
            
            {/* Post Preview text */}
            <p className="text-[12.5px] text-muted-foreground/60 italic truncate mt-0.5 max-w-[200px]">
              &ldquo;{notification.postId.text}&rdquo;
            </p>
            
            <span className="text-[11px] text-muted-foreground/50 mt-1 block font-medium">
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
            </span>
          </div>
        </Link>
      );
    })}
</div>
  );
}
