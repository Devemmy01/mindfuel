"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils";
import { formatCount } from "./navItems";
import { useShellData } from "./useShellData";

/** Mobile top-bar entry to Messages (the tab bar is limited to five items). */
export default function MessagesShortcut({ className }: { className?: string }) {
  const { user } = useAuth();
  const { unreadMessageCount } = useShellData();
  if (!user) return null;
  return (
    <Link
      href="/messages"
      aria-label={unreadMessageCount ? `Messages, ${unreadMessageCount} unread` : "Messages"}
      className={cn(
        "relative flex size-11 items-center justify-center rounded-full text-foreground/80 transition-colors hover:bg-accent active:bg-accent md:hidden",
        className,
      )}
    >
      <MessageCircle className="size-[1.375rem]" aria-hidden />
      {unreadMessageCount > 0 ? (
        <span
          aria-hidden
          className="absolute right-1 top-1 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] font-bold tabular-nums text-primary-foreground ring-2 ring-background"
        >
          {formatCount(unreadMessageCount)}
        </span>
      ) : null}
    </Link>
  );
}
