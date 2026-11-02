"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, PenLine } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";
import Avatar from "@/components/ui/Avatar";
import { formatCount, getNavItems, isActive, type NavItem } from "./navItems";
import { useShellData } from "./useShellData";

/**
 * Mobile navigation: at most five destinations with visible labels.
 * Signed in: Home, Search, Reflect, Alerts, Profile. Guests: Home, Search,
 * Reflect, Sign in. Messages lives in the top bar (see MessagesShortcut).
 */
export default function BottomTabBar({ hidden }: { hidden: boolean }) {
  const { user, profile, openSignInModal } = useAuth();
  const pathname = usePathname();
  const { unreadCount } = useShellData();
  const items = getNavItems(user?.uid);
  const byKey = (key: NavItem["key"]) => items.find((item) => item.key === key)!;

  // Toasts and other bottom-anchored UI sit above the bar while it is shown.
  React.useEffect(() => {
    const root = document.documentElement;
    if (hidden) root.style.removeProperty("--toast-offset");
    else root.style.setProperty("--toast-offset", "calc(var(--tabbar-height) + 0.75rem)");
    return () => {
      root.style.removeProperty("--toast-offset");
    };
  }, [hidden]);

  if (hidden) return null;

  const tab = (item: NavItem, badge = 0, icon?: React.ReactNode) => {
    const active = isActive(item, pathname);
    const Icon = item.icon;
    return (
      <Link
        key={item.key}
        href={item.href}
        data-coachmark={item.key}
        aria-current={active ? "page" : undefined}
        aria-label={badge ? `${item.label}, ${badge} unread` : item.label}
        onClick={(event) => {
          if (active && item.key === "home") {
            event.preventDefault();
            document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
          }
        }}
        className={cn(
          "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 transition-colors duration-fast active:bg-accent/60 touch-manipulation",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        <span className="relative">
          {icon ?? <Icon className="size-6" strokeWidth={active ? 2.4 : 1.9} aria-hidden />}
          {badge > 0 ? (
            <span
              aria-hidden
              className="absolute -right-2.5 -top-1 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] font-bold tabular-nums text-primary-foreground ring-2 ring-background"
            >
              {formatCount(badge)}
            </span>
          ) : null}
        </span>
        <span className={cn("text-[0.6875rem] leading-none", active ? "font-semibold" : "font-medium")}>
          {item.shortLabel || item.label}
        </span>
      </Link>
    );
  };

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-tabbar border-t border-line bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <div className="mx-auto flex h-[var(--tabbar-height)] max-w-lg items-stretch">
        {tab(byKey("home"))}
        {tab(byKey("search"))}
        <Link
          href="/create"
          data-coachmark="write"
          aria-label={copy.nav.writeLong}
          className="flex flex-1 flex-col items-center justify-center gap-1 touch-manipulation"
        >
          <span className="flex h-8 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform duration-fast active:scale-95">
            <PenLine className="size-[1.125rem]" strokeWidth={2.5} aria-hidden />
          </span>
          <span className="text-[0.6875rem] font-semibold leading-none text-foreground">{copy.nav.write}</span>
        </Link>
        {user ? (
          <>
            {tab(byKey("notifications"), unreadCount)}
            {tab(
              byKey("profile"),
              0,
              <Avatar
                src={profile?.image || user.photoURL}
                name={profile?.name || user.displayName}
                size="xs"
                className={cn(isActive(byKey("profile"), pathname) && "ring-2 ring-foreground")}
              />,
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={openSignInModal}
            className="flex flex-1 flex-col items-center justify-center gap-1 text-muted-foreground transition-colors active:bg-accent/60 touch-manipulation"
          >
            <LogIn className="size-6" strokeWidth={1.9} aria-hidden />
            <span className="text-[0.6875rem] font-medium leading-none">{copy.nav.signIn}</span>
          </button>
        )}
      </div>
    </nav>
  );
}
