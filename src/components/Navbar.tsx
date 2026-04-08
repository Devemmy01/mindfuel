"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { Home, Plus, Bookmark, User, LogOut, MoreHorizontal } from "lucide-react";

export default function Navbar() {
  const { user, profile, login, logout } = useAuth();
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navItems = [
    { href: "/",            icon: Home,     label: "Home"    },
    { href: "/collections", icon: Bookmark, label: "Saved"   },
    { href: "/profile",     icon: User,     label: "Profile" },
  ];

  return (
    <>
      {/* ── Desktop Sidebar ─────────────────────────────── */}
      <header className="hidden md:flex flex-col w-[72px] xl:w-[260px] shrink-0 sticky top-0 h-screen justify-between py-4 pr-2 pl-2 xl:pl-4 xl:pr-4 max-h-screen overflow-y-auto no-scrollbar items-center xl:items-start">
        <div className="flex flex-col w-full h-full items-center xl:items-start">

          {/* Logo */}
          <Link
            href="/"
            target="_self"
            className="mb-2 p-3 w-max rounded-2xl transition-colors flex items-center justify-center hover:bg-secondary/70 outline-none group"
          >
            <img
              src="/logo.png"
              alt="MindFuel"
              className="w-12 h-12 mx-auto object-contain rounded-full flex-shrink-0"
            />
            
          </Link>

          {/* Nav Links */}
          <nav className="flex flex-col w-full flex-1 items-center xl:items-start space-y-1 mt-1">
            {navItems.map(({ href, icon: Icon, label }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  target="_self"
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
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-brand-green" />
                    )}
                    <Icon
                      className={`w-[22px] h-[22px] flex-shrink-0 transition-colors ${
                        isActive
                          ? "text-brand-green"
                          : "text-foreground/70 group-hover:text-foreground"
                      }`}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                    <span
                      className={`hidden xl:inline text-[16px] leading-none ${
                        isActive ? "text-foreground" : "text-foreground/80"
                      }`}
                    >
                      {label}
                    </span>
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
                className="flex items-center justify pl-3 gap-3 px py-3 rounded-2xl bg-foreground text-background font-bold text-[14px] hover:opacity-90 transition-opacity w-full shadow-sm outline-none"
              >
                <User className="w-5 h-5 flex-shrink-0" />
                <span className="hidden xl:inline">Sign In with Google</span>
              </button>
            ) : (
              <div className="w-full relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-secondary/60 transition-colors w-full group outline-none"
                >
                  {profile?.image && !profile.image.startsWith("#") ? (
                    <img
                      src={profile.image}
                      alt={user?.displayName || "User"}
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
                        {user?.displayName?.[0]}
                      </span>
                    </div>
                  )}
                  <div className="hidden xl:flex flex-col text-left flex-1 min-w-0">
                    <span className="font-bold text-[14px] leading-tight text-foreground truncate">
                      {user?.displayName}
                    </span>
                    <span className="text-muted-foreground text-[13px] truncate">
                      @{user?.displayName?.replace(/\s+/g, "").toLowerCase()}
                    </span>
                  </div>
                  <MoreHorizontal className="hidden xl:block w-4 h-4 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                {/* Dropdown */}
                {showUserMenu && (
                  <div className="absolute bottom-full mb-2 left-0 xl:left-0 w-[220px] bg-popover border border-border rounded-2xl shadow-card py-1 z-50 animate-scale-in">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="font-bold text-[14px]">{user.displayName}</p>
                      <p className="text-muted-foreground text-[12px]">
                        @{user.displayName?.replace(/\s+/g, "").toLowerCase()}
                      </p>
                    </div>
                    <button
                      onClick={() => { logout(); setShowUserMenu(false); }}
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
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 glass-strong border-t border-border/60 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between h-[56px] px-2">

          {/* Feed */}
          <Link
            href="/"
            target="_self"
            className="flex-1 h-full flex flex-col items-center justify-center press-scale outline-none relative"
          >
            <Home
              className={`w-6 h-6 transition-colors ${
                pathname === "/" ? "text-brand-green" : "text-muted-foreground"
              }`}
              strokeWidth={pathname === "/" ? 2.5 : 2}
            />
            {pathname === "/" && (
              <span className="mt-1 text-[9px] font-bold text-brand-green leading-none">Home</span>
            )}
          </Link>



          {/* Create – Elevated center button */}
          <Link
            href="/create"
            target="_self"
            className="flex-1 h-full flex items-center justify-center outline-none"
          >
            <div className="w-12 h-12 bg-brand-green rounded-2xl flex items-center justify-center shadow-brand-sm press-scale active:bg-[#009950] transition-colors -mt-3">
              <Plus className="w-6 h-6 text-white" strokeWidth={2.75} />
            </div>
          </Link>

          {/* Saved */}
          <Link
            href="/collections"
            target="_self"
            className="flex-1 h-full flex flex-col items-center justify-center press-scale outline-none relative"
          >
            <Bookmark
              className={`w-6 h-6 transition-colors ${
                pathname === "/collections" ? "text-brand-green" : "text-muted-foreground"
              }`}
              strokeWidth={pathname === "/collections" ? 2.5 : 2}
            />
            {pathname === "/collections" && (
              <span className="mt-1 text-[9px] font-bold text-brand-green leading-none">Saved</span>
            )}
          </Link>

          {/* Profile / Login */}
          {user ? (
            <Link
              href="/profile"
              target="_self"
              className="flex-1 h-full flex flex-col items-center justify-center press-scale outline-none"
            >
              {user.photoURL ? (
                user.photoURL.startsWith("#") ? (
                  <div 
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                      pathname === "/profile" ? "ring-2 ring-brand-green ring-offset-1 ring-offset-background" : ""
                    }`}
                    style={{ backgroundColor: user.photoURL }}
                  >
                    <span className="text-[11px] font-bold text-white uppercase">{user.displayName?.[0]}</span>
                  </div>
                ) : (
                  <img
                    src={user.photoURL}
                    alt="Profile"
                    className={`w-7 h-7 rounded-full object-cover transition-all ${
                      pathname === "/profile" ? "ring-2 ring-brand-green ring-offset-1 ring-offset-background" : ""
                    }`}
                  />
                )
              ) : (
                <User
                  className={`w-6 h-6 transition-colors ${
                    pathname === "/profile" ? "text-brand-green" : "text-muted-foreground"
                  }`}
                  strokeWidth={pathname === "/profile" ? 2.5 : 2}
                />
              )}
              {pathname === "/profile" && (
                <span className="mt-1 text-[9px] font-bold text-brand-green leading-none">Profile</span>
              )}
            </Link>
          ) : (
            <button
              onClick={login}
              className="flex-1 h-full flex items-center justify-center press-scale outline-none"
            >
              <User className="w-6 h-6 text-muted-foreground" strokeWidth={2} />
            </button>
          )}

        </div>
      </nav>
    </>
  );
}
