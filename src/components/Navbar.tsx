"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { Home, Search, Plus, Bookmark, User, LogOut, MoreHorizontal, Bell } from "lucide-react";
import NotificationsList, { AppNotification } from "./NotificationsList";

export default function Navbar() {
  const { user, profile, logout, openSignInModal } = useAuth();
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const desktopNotificationsRef = useRef<HTMLDivElement>(null);
  const mobileNotificationsRef = useRef<HTMLButtonElement>(null);
  const mobileOverlayRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      
      let closeNotifications = true;
      if (
        desktopNotificationsRef.current?.contains(target) ||
        mobileNotificationsRef.current?.contains(target) ||
        mobileOverlayRef.current?.contains(target)
      ) {
        closeNotifications = false;
      }

      let closeMenu = true;
      if (userMenuRef.current?.contains(target)) {
        closeMenu = false;
      }

      if (showNotifications && closeNotifications) setShowNotifications(false);
      if (showUserMenu && closeMenu) setShowUserMenu(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifications, showUserMenu]);

  // Fetch notifications
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const fetchNotifications = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/notifications?userId=${user.uid}`);
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount);
        }
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
    // Poll every 120 seconds for new notifications
    const interval = setInterval(fetchNotifications, 120000);
    return () => clearInterval(interval);
  }, [user]);

  const markAllAsRead = async () => {
    if (!user || unreadCount === 0) return;
    try {
      setUnreadCount(0);
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      });
      // Update local state isRead status
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error("Failed to mark notifications as read", err);
    }
  };

  // Close menus on navigation
  useEffect(() => {
    setShowUserMenu(false);
    setShowNotifications(false);
  }, [pathname]);

  const displayImage = profile?.image || user?.photoURL;
  const displayName = profile?.name || user?.displayName;

  const navItems = [
    { href: "/",            icon: Home,     label: "Home"    },
    { href: "/notifications", icon: Bell,     label: "Notifications", isNotification: true },
    { href: "/collections", icon: Bookmark, label: "Saved"   },
    { href: "/profile",     icon: User,     label: "Profile" },
  ];

  return (
    <>
      {/* ── Desktop Sidebar ─────────────────────────────── */}
      <header className="hidden md:flex flex-col w-[72px] xl:w-[260px] shrink-0 sticky top-0 h-screen justify-between py-4 pr-2 pl-2 xl:pl-4 xl:pr-4 max-h-screen items-center xl:items-start z-[100]" role="banner">
        <div className="flex flex-col w-full h-full items-center xl:items-start">

          {/* Logo */}
          <Link
            href="/"
            target="_self"
            aria-label="MindFuel home"
            className="mb-2 p-3 w-max rounded-2xl transition-colors flex items-center justify-center hover:bg-secondary/70 outline-none group"
          >
            <Image
              src="/logoDarkbg.png"
              alt="MindFuel"
              width={160}
              height={48}
              priority
              className="mx-auto object-contain rounded-full flex-shrink-0 md:hidden xl:block"
            />

            <Image
              src="/maskable-icon.png"
              alt="MindFuel"
              width={48}
              height={48}
              priority
              className="mx-auto object-contain rounded-full flex-shrink-0 hidden md:block xl:hidden"
            />
            
          </Link>

          {/* Nav Links */}
          <nav className="flex flex-col w-full flex-1 items-center xl:items-start space-y-1 mt-1" aria-label="Main navigation">
            {navItems.map(({ href, icon: Icon, label, isNotification }) => {
              const isActive = pathname === href;
              
              if (isNotification) {
                return (
                  <div key={href} className="w-full relative" ref={desktopNotificationsRef}>
                    <button
                      onClick={() => {
                        setShowNotifications(!showNotifications);
                        if (!showNotifications) markAllAsRead();
                      }}
                      className={`w-full flex justify-center xl:justify-start outline-none transition-colors group px-3 py-3 rounded-2xl
                        ${showNotifications ? "bg-secondary/60 font-bold" : "font-medium hover:bg-secondary/50"}
                      `}
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <Icon
                            className={`w-[22px] h-[22px] flex-shrink-0 transition-colors ${
                              showNotifications ? "text-brand-green" : "text-foreground/70 group-hover:text-foreground"
                            }`}
                            strokeWidth={2}
                          />
                          {unreadCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[10px] pt-1 font-bold text-white shadow-[0_0_8px_var(--brand-green)] ring-1 ring-background animate-in zoom-in duration-300">
                              {unreadCount > 9 ? "9+" : unreadCount}
                            </span>
                          )}
                        </div>
                        <span className={`hidden xl:inline text-[16px] leading-none ${showNotifications ? "text-foreground" : "text-foreground/80"}`}>
                          {label}
                        </span>
                      </div>
                    </button>

                    {/* Desktop Notifications Popover */}
                    {showNotifications && (
                      <div className="absolute left-full ml-2 top-0 w-[320px] bg-[#0a0a0a] border border-border rounded-3xl shadow-2xl z-[200] animate-scale-in overflow-hidden">
                        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                          <h3 className="font-bold text-[16px]">Notifications</h3>
                          {unreadCount > 0 && (
                            <span className="text-[11px] font-bold text-brand-green bg-brand-green/10 px-2 py-0.5 rounded-full">
                              {unreadCount} New
                            </span>
                          )}
                        </div>
                        <NotificationsList 
                          notifications={notifications} 
                          onMarkRead={markAllAsRead}
                          isLoading={isLoading}
                          onClose={() => setShowNotifications(false)}
                        />
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={href}
                  href={href}
                  onClick={(e) => {
                    if (pathname === href && href === "/") {
                      e.preventDefault();
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                  target="_self"
                  aria-current={isActive ? "page" : undefined}
                  className="w-full flex justify-center xl:justify-start outline-none"
                >
                  <div
                    className={`relative flex items-center gap-4 px-3 py-3 rounded-2xl w-full xl:w-auto transition-colors group
                      ${isActive
                        ? "bg-secondary/60 font-bold"
                        : "font-medium hover:bg-secondary/50"
                      }`}
                  >
                    {/* Active indicator bar */}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-brand-green" aria-hidden="true" />
                    )}
                    <Icon
                      className={`w-[22px] h-[22px] flex-shrink-0 transition-colors ${
                        isActive
                          ? "text-brand-green"
                          : "text-foreground/70 group-hover:text-foreground"
                      }`}
                      strokeWidth={isActive ? 2.5 : 2}
                      aria-hidden="true"
                    />
                    <span
                      className={`hidden xl:inline text-[16px] leading-none ${
                        isActive ? "text-foreground" : "text-foreground/80"
                      }`}
                    >
                      {label}
                    </span>
                    <span className="sr-only xl:hidden">{label}</span>
                  </div>
                </Link>
              );
            })}

            {/* Create / Post Button */}
            <div className="pt-3 w-full flex justify-center xl:justify-start">
              <Link
                href="/create"
                target="_self"
                className="outline-none block w-full"
              >
                <div className="bg-[#00a855] active:bg-[#009950] text-white font-bold transition-colors rounded-full flex items-center justify-center gap-2 px-3 py-3 xl:py-3 shadow-brand-sm">
                  <Plus className="w-5 h-5 flex-shrink-0" strokeWidth={3} />
                  <span className="hidden xl:inline text-[15px]">New Post</span>
                </div>
              </Link>
            </div>
          </nav>

          {/* User Profile Bottom */}
          <div className="mt-auto w-full flex justify-center xl:justify-start relative">
            {!user ? (
              <button
                onClick={openSignInModal}
                aria-label="Sign in with Google"
                className="flex items-center justify pl-3 gap-3 px py-3 rounded-2xl bg-foreground text-background font-bold text-[14px] hover:opacity-90 transition-opacity w-full shadow-sm outline-none"
              >
                <User className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                <span className="hidden xl:inline">Sign In with Google</span>
              </button>
            ) : (
              <div className="w-full relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  aria-label="User menu"
                  aria-expanded={showUserMenu}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-secondary/60 transition-colors w-full group outline-none"
                >
                  {displayImage && !displayImage.startsWith("#") && !imgError ? (
                    <Image
                      src={displayImage}
                      alt={displayName || "User"}
                      width={36}
                      height={36}
                      onError={() => setImgError(true)}
                      className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-2 ring-brand-green/30"
                    />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ring-2 ring-brand-green/30"
                      style={{
                        backgroundColor: "#0a0a0a",
                      }}
                    >
                      <span className="text-[13px] font-bold text-white uppercase">
                        {displayName?.[0]}
                      </span>
                    </div>
                  )}
                  <div className="hidden xl:flex flex-col text-left flex-1 min-w-0">
                    <span className="font-bold text-[14px] leading-tight text-foreground truncate">
                      {displayName}
                    </span>
                    <span className="text-muted-foreground text-[13px] truncate">
                      @{profile?.username || (displayName?.replace(/\s+/g, "").toLowerCase() || "guest")}
                    </span>
                  </div>
                  <MoreHorizontal className="hidden xl:block w-4 h-4 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                {/* Dropdown */}
                {showUserMenu && (
                  <div className="absolute bottom-full mb-2 left-0 xl:left-0 w-[220px] bg-popover border border-border rounded-2xl shadow-card py-1 z-[200] animate-scale-in">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="font-bold text-[14px]">{displayName}</p>
                      <p className="text-muted-foreground text-[12px]">
                        @{profile?.username || (displayName?.replace(/\s+/g, "").toLowerCase() || "guest")}
                      </p>
                    </div>
                    <Link
                      href="/collections"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 text-[14px] font-medium text-foreground hover:bg-secondary/60 transition-colors w-full"
                    >
                      <Bookmark className="w-4 h-4" />
                      Saved
                    </Link>
                    <button
                      onClick={() => { logout(); setShowUserMenu(false); }}
                      aria-label="Sign out"
                      className="flex items-center gap-3 px-4 py-3 text-[14px] font-medium text-foreground hover:bg-secondary/60 transition-colors w-full rounded-b-2xl"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Mobile Bottom Navigation ────────────────────── */}
      <div 
        className={`md:hidden fixed bottom-0 left-0 w-full z-[100] px-4 pb-safe pointer-events-none transition-all duration-500 ${
          pathname === '/create' 
            ? 'translate-y-[150%] opacity-0' 
            : 'translate-y-0 opacity-100'
        }`}
      >
        <nav className="glass-strong bg-background/85 backdrop-blur-2xl border border-border/80 shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] rounded-full flex items-center justify-between h-[64px] px-2 mb-4 pointer-events-auto mx-auto max-w-[400px]" aria-label="Mobile navigation">

          {/* Feed */}
          <Link
            href="/"
            onClick={(e) => {
              if (pathname === "/") {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            target="_self"
            aria-label="Home"
            aria-current={pathname === "/" ? "page" : undefined}
            className="flex-1 h-full flex flex-col items-center justify-center press-scale outline-none relative group"
          >
            <Home
              className={`w-[22px] h-[22px] transition-all duration-300 ${
                pathname === "/" ? "text-brand-green translate-y-[-2px]" : "text-muted-foreground group-hover:text-foreground"
              }`}
              strokeWidth={pathname === "/" ? 2.5 : 2}
            />
            <span className={`absolute bottom-1.5 text-[9px] font-bold text-brand-green leading-none transition-all duration-300 ${pathname === "/" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
              Home
            </span>
          </Link>

          {/* Search */}
          <Link
            href="/search"
            target="_self"
            aria-label="Search"
            aria-current={pathname === "/search" ? "page" : undefined}
            className="flex-1 h-full flex flex-col items-center justify-center press-scale outline-none relative group"
          >
            <Search
              className={`w-[22px] h-[22px] transition-all duration-300 ${
                pathname === "/search" ? "text-brand-green translate-y-[-2px]" : "text-muted-foreground group-hover:text-foreground"
              }`}
              strokeWidth={pathname === "/search" ? 2.5 : 2}
            />
            <span className={`absolute bottom-1.5 text-[9px] font-bold text-brand-green leading-none transition-all duration-300 ${pathname === "/search" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
              Search
            </span>
          </Link>

          {/* Create – Elevated center button */}
          <Link
            href="/create"
            target="_self"
            aria-label="Create new post"
            className="flex-1 h-full flex flex-col items-center justify-center outline-none"
          >
            <div className="w-[46px] h-[46px] bg-[#00a855] rounded-full flex items-center justify-center shadow-brand-sm press-scale active:bg-[#009950] transition-transform hover:scale-105">
              <Plus className="w-6 h-6 text-white" strokeWidth={2.75} />
            </div>
          </Link>

          {/* Notifications Trigger Mobile */}
          <button
            ref={mobileNotificationsRef}
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (!showNotifications) markAllAsRead();
            }}
            aria-label="Notifications"
            className="flex-1 h-full flex flex-col items-center justify-center press-scale outline-none relative group"
          >
            <div className={`relative transition-all duration-300 flex flex-col items-center justify-center ${showNotifications ? "translate-y-[-2px]" : ""}`}>
              <Bell
                className={`w-[22px] h-[22px] transition-all duration-300 ${
                  showNotifications ? "text-brand-green" : "text-muted-foreground group-hover:text-foreground"
                }`}
                strokeWidth={showNotifications ? 2.5 : 2}
              />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white shadow-[0_0_8px_var(--brand-green)] ring-2 ring-background animate-in zoom-in duration-300">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <span className={`absolute bottom-1.5 text-[9px] font-bold text-brand-green leading-none transition-all duration-300 ${showNotifications ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
              Alerts
            </span>
          </button>

          {user ? (
            <Link
              href="/profile"
              target="_self"
              aria-label="Profile"
              aria-current={pathname === "/profile" ? "page" : undefined}
              className="flex-1 h-full flex flex-col items-center justify-center press-scale outline-none relative group"
            >
              <div className={`transition-all duration-300 flex flex-col items-center justify-center ${pathname === "/profile" ? "translate-y-[-2px]" : ""}`}>
                {displayImage && !displayImage.startsWith("#") && !imgError ? (
                  <Image
                    src={displayImage}
                    alt="Profile"
                    width={24}
                    height={24}
                    onError={() => setImgError(true)}
                    className={`w-[24px] h-[24px] rounded-full object-cover transition-all duration-300 ${
                      pathname === "/profile" ? "ring-2 ring-brand-green ring-offset-2 ring-offset-background" : "opacity-80 group-hover:opacity-100"
                    }`}
                  />
                ) : displayImage?.startsWith("#") || (displayImage && imgError) ? (
                  <div 
                    className={`w-[24px] h-[24px] rounded-full flex items-center justify-center transition-all duration-300 ${
                      pathname === "/profile" ? "ring-2 ring-brand-green ring-offset-2 ring-offset-background" : "opacity-80 group-hover:opacity-100"
                    }`}
                    style={{ backgroundColor: displayImage && !imgError ? displayImage : "#0a0a0a" }}
                  >
                    <span className="text-[10px] font-bold text-white uppercase">{displayName?.[0]}</span>
                  </div>
                ) : (
                  <User
                    className={`w-[22px] h-[22px] transition-all duration-300 ${
                      pathname === "/profile" ? "text-brand-green" : "text-muted-foreground group-hover:text-foreground"
                    }`}
                    strokeWidth={pathname === "/profile" ? 2.5 : 2}
                  />
                )}
              </div>
              <span className={`absolute bottom-1.5 text-[9px] font-bold text-brand-green leading-none transition-all duration-300 ${pathname === "/profile" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
                Profile
              </span>
            </Link>
          ) : (
            <button
              onClick={openSignInModal}
              aria-label="Sign in"
              className="flex-1 h-full flex flex-col items-center justify-center press-scale outline-none relative group"
            >
              <div className="transition-all duration-300 flex flex-col items-center justify-center translate-y-[-2px]">
                <User className="w-[20px] h-[20px] text-muted-foreground group-hover:text-foreground transition-colors" strokeWidth={2} aria-hidden="true" />
              </div>
              <span className="absolute bottom-1.5 text-[9px] font-bold text-foreground opacity-100 translate-y-0 transition-opacity">
                Sign In
              </span>
            </button>
          )}

        </nav>
      </div>

      {/* Mobile Notifications Overlay */}
      {showNotifications && (
        <div 
          ref={mobileOverlayRef}
          className="md:hidden fixed inset-0 z-[200] bg-[#0a0a0a] animate-in slide-in-from-bottom duration-300"
        >
          <div className="flex flex-col h-full">
            <header className="p-4 border-b border-border flex items-center justify-between sticky top-0 bg-[#0a0a0a]/80 backdrop-blur-xl z-20">
              <h2 className="text-xl font-bold">Notifications</h2>
              <button 
                onClick={() => setShowNotifications(false)}
                className="p-2 rounded-full hover:bg-secondary/60 transition-colors"
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto pb-safe">
              <NotificationsList 
                notifications={notifications} 
                onMarkRead={markAllAsRead}
                isLoading={isLoading}
                onClose={() => setShowNotifications(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
