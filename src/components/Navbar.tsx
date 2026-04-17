"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { Home, Search, Plus, Bookmark, User, LogOut, MoreHorizontal } from "lucide-react";

export default function Navbar() {
  const { user, profile, login, logout } = useAuth();
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const displayImage = profile?.image || user?.photoURL;
  const displayName = profile?.name || user?.displayName;

  const navItems = [
    { href: "/",            icon: Home,     label: "Home"    },
    { href: "/collections", icon: Bookmark, label: "Saved"   },
    { href: "/profile",     icon: User,     label: "Profile" },
  ];

  return (
    <>
      {/* ── Desktop Sidebar ─────────────────────────────── */}
      <header className="hidden md:flex flex-col w-[72px] xl:w-[260px] shrink-0 sticky top-0 h-screen justify-between py-4 pr-2 pl-2 xl:pl-4 xl:pr-4 max-h-screen overflow-y-auto no-scrollbar items-center xl:items-start" role="banner">
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
              src="/logo.png"
              alt="MindFuel"
              width={48}
              height={48}
              priority
              className="mx-auto object-contain rounded-full flex-shrink-0 md:block xl:hidden"
            />
            
          </Link>

          {/* Nav Links */}
          <nav className="flex flex-col w-full flex-1 items-center xl:items-start space-y-1 mt-1" aria-label="Main navigation">
            {navItems.map(({ href, icon: Icon, label }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
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
                <div className="bg-[#00a855] active:bg-[#009950] text-white font-bold transition-colors rounded-2xl flex items-center justify-center gap-2 px-3 py-3 xl:py-3 shadow-brand-sm">
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
                onClick={login}
                aria-label="Sign in with Google"
                className="flex items-center justify pl-3 gap-3 px py-3 rounded-2xl bg-foreground text-background font-bold text-[14px] hover:opacity-90 transition-opacity w-full shadow-sm outline-none"
              >
                <User className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                <span className="hidden xl:inline">Sign In with Google</span>
              </button>
            ) : (
              <div className="w-full relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  aria-label="User menu"
                  aria-expanded={showUserMenu}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-secondary/60 transition-colors w-full group outline-none"
                >
                  {displayImage && !displayImage.startsWith("#") ? (
                    <img
                      src={displayImage}
                      alt={displayName || "User"}
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
                      @{displayName?.replace(/\s+/g, "").toLowerCase()}
                    </span>
                  </div>
                  <MoreHorizontal className="hidden xl:block w-4 h-4 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                {/* Dropdown */}
                {showUserMenu && (
                  <div className="absolute bottom-full mb-2 left-0 xl:left-0 w-[220px] bg-popover border border-border rounded-2xl shadow-card py-1 z-50 animate-scale-in">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="font-bold text-[14px]">{displayName}</p>
                      <p className="text-muted-foreground text-[12px]">
                        @{displayName?.replace(/\s+/g, "").toLowerCase()}
                      </p>
                    </div>
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

          {/* Saved */}
          <Link
            href="/collections"
            target="_self"
            aria-label="Saved reflections"
            aria-current={pathname === "/collections" ? "page" : undefined}
            className="flex-1 h-full flex flex-col items-center justify-center press-scale outline-none relative group"
          >
            <Bookmark
              className={`w-[22px] h-[22px] transition-all duration-300 ${
                pathname === "/collections" ? "text-brand-green translate-y-[-2px]" : "text-muted-foreground group-hover:text-foreground"
              }`}
              strokeWidth={pathname === "/collections" ? 2.5 : 2}
            />
            <span className={`absolute bottom-1.5 text-[9px] font-bold text-brand-green leading-none transition-all duration-300 ${pathname === "/collections" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
              Saved
            </span>
          </Link>

          {/* Profile / Login */}
          {user ? (
            <Link
              href="/profile"
              target="_self"
              aria-label="Profile"
              aria-current={pathname === "/profile" ? "page" : undefined}
              className="flex-1 h-full flex flex-col items-center justify-center press-scale outline-none relative group"
            >
              <div className={`transition-all duration-300 flex flex-col items-center justify-center ${pathname === "/profile" ? "translate-y-[-2px]" : ""}`}>
                {displayImage ? (
                  displayImage.startsWith("#") ? (
                    <div 
                      className={`w-[24px] h-[24px] rounded-full flex items-center justify-center transition-all duration-300 ${
                        pathname === "/profile" ? "ring-2 ring-brand-green ring-offset-2 ring-offset-background" : "opacity-80 group-hover:opacity-100"
                      }`}
                      style={{ backgroundColor: displayImage }}
                    >
                      <span className="text-[10px] font-bold text-white uppercase">{displayName?.[0]}</span>
                    </div>
                  ) : (
                    <img
                      src={displayImage}
                      alt="Profile"
                      className={`w-[24px] h-[24px] rounded-full object-cover transition-all duration-300 ${
                        pathname === "/profile" ? "ring-2 ring-brand-green ring-offset-2 ring-offset-background" : "opacity-80 group-hover:opacity-100"
                      }`}
                    />
                  )
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
              onClick={login}
              aria-label="Sign in"
              className="flex-1 h-full flex flex-col items-center justify-center press-scale outline-none relative group"
            >
              <User className="w-[22px] h-[22px] text-muted-foreground group-hover:text-foreground transition-colors" strokeWidth={2} aria-hidden="true" />
            </button>
          )}

        </nav>
      </div>
    </>
  );
}
