"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import SearchUsers from "@/components/SearchUsers";
import MindfulTip from "@/components/MindfulTip";
import MindfulSaves from "@/components/MindfulSaves";
import GuestSignInPrompt from "@/components/GuestSignInPrompt";
import AppLandingCard from "@/components/AppLandingCard";
import SuggestedConnections from "@/components/SuggestedConnections";

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMessages = pathname === "/messages";
  const isStandalonePage =
    pathname === "/tip/download" || pathname === "/" || pathname.startsWith("/guides");

  if (isStandalonePage) {
    return (
      <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
        {/* Floating Ambient Background Orbs */}
        <div className="absolute -top-40 -left-60 w-[500px] h-[500px] rounded-full bg-brand-green/10 blur-[120px] pointer-events-none -z-10 opacity-70 animate-float-1" />
        <div className="absolute top-[40%] -right-80 w-[600px] h-[600px] rounded-full bg-emerald-700/8 blur-[140px] pointer-events-none -z-10 opacity-60 animate-float-2" />
        {children}
      </div>
    );
  }

  return (
    <div className="app-shell h-[100dvh] overflow-hidden bg-background text-foreground selection:bg-brand-green/20 flex justify-center relative">
      <div className={`relative z-10 flex h-full w-full ${isMessages ? "md:max-w-[1180px] xl:max-w-[1320px]" : "md:max-w-[672px] lg:max-w-[1040px] xl:max-w-[1240px]"}`}>
        {/* ── Left Sidebar (Navbar) ── */}
        <Navbar />

        {/* ── Main Feed Column ── */}
        <main className={`app-main flex-grow w-full min-w-0 md:border-x md:border-border/70 h-full no-scrollbar ${isMessages ? "overflow-hidden md:max-w-none" : "overflow-y-auto md:max-w-[600px]"}`}>
          {children}
        </main>

        {/* ── Right Rail (lg+) ── */}
        {!isMessages && <aside className="no-scrollbar hidden lg:flex h-full w-[368px] shrink-0 flex-col overflow-y-auto pb-10 pl-8 pr-3 pt-6 scroll-smooth">
          {/* Search */}
          <SearchUsers />

          {/* Guest Sign-in Prompt (only visible when logged out) */}
          <div className="mt-4">
          <GuestSignInPrompt />
          </div>

          <SuggestedConnections />

          {/* Mindful Tip */}
          <MindfulTip />

          {/* Authenticated users can intentionally revisit the public product story. */}
          <AppLandingCard />

          {/* Saved Reflections */}
          <MindfulSaves />

        </aside>}
      </div>
    </div>
  );
}
