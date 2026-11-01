"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Download, Info, LogIn, LogOut, MoreHorizontal, PenLine } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";
import Avatar from "@/components/ui/Avatar";
import { formatCount, getNavItems, isActive } from "./navItems";
import { useShellData } from "./useShellData";

/**
 * Desktop navigation. Icon-only at `md`, labeled from `lg`. The Reflect
 * action is the one primary button and always shows its label.
 */
export default function AppRail() {
  const { user, profile, logout, openSignInModal } = useAuth();
  const pathname = usePathname();
  const { unreadCount, unreadMessageCount } = useShellData();
  const items = getNavItems(user?.uid).filter((item) => user || item.public);
  const [standalone, setStandalone] = React.useState(false);
  React.useEffect(() => {
    setStandalone(window.matchMedia("(display-mode: standalone)").matches);
  }, []);
  const displayName = profile?.name || user?.displayName || "";
  const handle = profile?.username || displayName.replace(/\s+/g, "").toLowerCase();

  const badgeFor = (key: string) =>
    key === "notifications" ? unreadCount : key === "messages" ? unreadMessageCount : 0;

  return (
    <header
      role="banner"
      className="sticky top-0 z-rail hidden h-dvh w-[76px] shrink-0 flex-col py-3 md:flex lg:w-[232px] lg:px-3"
    >
      <Link
        href={user ? "/feed" : "/"}
        aria-label="MindFuel home"
        className="mx-auto mb-3 flex h-12 items-center rounded-card px-2 hover:bg-accent lg:mx-0"
      >
        <Image src="/maskable-icon.png" alt="" width={36} height={36} priority className="size-9 rounded-full lg:hidden" />
        <Image src="/logoDarkbg.png" alt="MindFuel" width={132} height={40} priority className="hidden h-9 w-auto lg:block" />
      </Link>

      <nav aria-label="Main" className="flex flex-col items-center gap-0.5 lg:items-stretch">
        {items.map((item) => {
          const active = isActive(item, pathname);
          const badge = badgeFor(item.key);
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? "page" : undefined}
              aria-label={badge ? `${item.label}, ${badge} unread` : item.label}
              onClick={(event) => {
                if (active && item.key === "home") {
                  event.preventDefault();
                  document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              className={cn(
                "group relative flex size-12 items-center justify-center gap-3.5 rounded-card transition-colors duration-fast lg:h-11 lg:w-full lg:justify-start lg:px-3",
                active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/70 hover:text-foreground",
              )}
            >
              <span className="relative">
                <Icon className="size-[1.375rem]" strokeWidth={active ? 2.4 : 2} aria-hidden />
                {badge > 0 ? (
                  <span
                    aria-hidden
                    className="absolute -right-2 -top-1.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] font-bold tabular-nums text-primary-foreground ring-2 ring-background"
                  >
                    {formatCount(badge)}
                  </span>
                ) : null}
              </span>
              <span className={cn("hidden text-body lg:inline", active ? "font-semibold" : "font-medium")}>{item.label}</span>
            </Link>
          );
        })}

        <Link
          href="/create"
          className="mt-3 flex size-14 flex-col items-center justify-center gap-0.5 rounded-card bg-primary text-primary-foreground transition-colors duration-fast hover:bg-primary-hover active:scale-[0.98] lg:h-12 lg:w-full lg:flex-row lg:gap-2"
        >
          <PenLine className="size-5" strokeWidth={2.4} aria-hidden />
          <span className="text-[0.6875rem] font-bold leading-none lg:text-body lg:leading-normal">{copy.nav.write}</span>
        </Link>
      </nav>

      <div className="mt-auto flex flex-col items-center lg:items-stretch">
        {!user ? (
          <div className="flex flex-col items-center gap-2 lg:items-stretch lg:rounded-card lg:border lg:border-line lg:bg-surface lg:p-3">
            <p className="hidden text-caption font-semibold text-foreground lg:block">{copy.nav.unlockMore}</p>
            <p className="hidden text-micro text-muted-foreground lg:block">{copy.nav.unlockMoreHint}</p>
            <button
              type="button"
              onClick={openSignInModal}
              aria-label={copy.nav.unlockMore}
              className="flex size-12 items-center justify-center gap-2 rounded-card border border-line bg-surface font-semibold text-foreground transition-colors hover:bg-surface-elevated lg:mt-1 lg:h-10 lg:w-full lg:text-caption"
            >
              <LogIn className="size-5 lg:size-4" aria-hidden />
              <span className="hidden lg:inline">{copy.nav.signIn}</span>
            </button>
          </div>
        ) : (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger
              aria-label="Account menu"
              className="flex size-12 items-center justify-center gap-3 rounded-card text-left outline-none transition-colors hover:bg-accent data-[state=open]:bg-accent lg:h-14 lg:w-full lg:justify-start lg:px-2"
            >
              <Avatar src={profile?.image || user.photoURL} name={displayName} size="sm" />
              <span className="hidden min-w-0 flex-1 lg:block">
                <span className="block truncate text-caption font-semibold text-foreground">{displayName}</span>
                <span className="block truncate text-micro text-muted-foreground">@{handle}</span>
              </span>
              <MoreHorizontal className="hidden size-4 text-muted-foreground lg:block" aria-hidden />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                side="top"
                align="start"
                sideOffset={8}
                className="z-dropdown w-60 overflow-hidden rounded-card border border-line bg-surface-raised p-1 text-foreground shadow-e3"
              >
                <div className="px-3 py-2.5">
                  <p className="truncate text-caption font-semibold">{displayName}</p>
                  <p className="truncate text-micro text-muted-foreground">@{handle}</p>
                </div>
                <DropdownMenu.Separator className="my-1 h-px bg-line" />
                <DropdownMenu.Item asChild>
                  <Link href="/?view=landing" className="flex h-10 items-center gap-3 rounded-control px-3 text-body-sm outline-none data-[highlighted]:bg-accent">
                    <Info className="size-4 text-muted-foreground" aria-hidden />
                    {copy.nav.about}
                  </Link>
                </DropdownMenu.Item>
                {!standalone ? (
                  <DropdownMenu.Item
                    onSelect={() => window.dispatchEvent(new Event("mindfuel:request-install"))}
                    className="flex h-10 cursor-pointer items-center gap-3 rounded-control px-3 text-body-sm outline-none data-[highlighted]:bg-accent"
                  >
                    <Download className="size-4 text-muted-foreground" aria-hidden />
                    Install the app
                  </DropdownMenu.Item>
                ) : null}
                <DropdownMenu.Separator className="my-1 h-px bg-line" />
                <DropdownMenu.Item
                  onSelect={() => void logout()}
                  className="flex h-10 cursor-pointer items-center gap-3 rounded-control px-3 text-body-sm outline-none data-[highlighted]:bg-accent"
                >
                  <LogOut className="size-4 text-muted-foreground" aria-hidden />
                  {copy.nav.signOut}
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        )}
      </div>
    </header>
  );
}
