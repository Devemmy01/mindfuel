import { Bell, Bookmark, Home, MessageCircle, Search, User, type LucideIcon } from "lucide-react";
import { copy } from "@/lib/copy";

export type NavKey = "home" | "search" | "notifications" | "messages" | "saved" | "profile";

export type NavItem = {
  key: NavKey;
  href: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  /** Guests only see public destinations; the rest sit behind sign-in. */
  public: boolean;
};

export function getNavItems(uid?: string | null): NavItem[] {
  return [
    { key: "home", href: "/feed", label: copy.nav.home, icon: Home, public: true },
    { key: "search", href: "/search", label: copy.nav.search, icon: Search, public: true },
    { key: "notifications", href: "/notifications", label: copy.nav.notifications, shortLabel: copy.nav.notificationsShort, icon: Bell, public: false },
    { key: "messages", href: "/messages", label: copy.nav.messages, icon: MessageCircle, public: false },
    { key: "saved", href: "/collections", label: copy.nav.saved, icon: Bookmark, public: false },
    { key: "profile", href: uid ? `/profile/${uid}` : "/profile", label: copy.nav.profile, icon: User, public: false },
  ];
}

export function isActive(item: NavItem, pathname: string) {
  if (item.key === "profile") return pathname.startsWith("/profile");
  if (item.key === "home") return pathname === "/feed";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function formatCount(count: number) {
  return count > 99 ? "99+" : String(count);
}
