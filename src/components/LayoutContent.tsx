"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import SearchUsers from "@/components/SearchUsers";
import MindfulTip from "@/components/MindfulTip";
import MindfulSaves from "@/components/MindfulSaves";
import GuestSignInPrompt from "@/components/GuestSignInPrompt";

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStandalonePage = pathname === "/tip/download";

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
    <div className="h-[100dvh] overflow-hidden bg-background text-foreground selection:bg-brand-green/20 flex justify-center relative">
      {/* Floating Ambient Background Orbs */}
      <div className="absolute -top-40 -left-60 w-[500px] h-[500px] rounded-full bg-brand-green/10 blur-[120px] pointer-events-none -z-10 opacity-80 animate-float-1" />
      <div className="absolute top-[30%] -right-80 w-[650px] h-[650px] rounded-full bg-emerald-800/8 blur-[150px] pointer-events-none -z-10 opacity-60 animate-float-2" />
      <div className="absolute -bottom-40 left-1/4 w-[400px] h-[400px] rounded-full bg-[#10b981]/5 blur-[100px] pointer-events-none -z-10 opacity-50 animate-float-1" />

      <div className="flex w-full md:max-w-[672px] lg:max-w-[1022px] xl:max-w-[1210px] h-full">
        {/* ── Left Sidebar (Navbar) ── */}
        <Navbar />

        {/* ── Main Feed Column ── */}
        <main className="flex-grow w-full min-w-0 md:max-w-[600px] md:border-x md:border-border overflow-y-auto h-full no-scrollbar">
          {children}
        </main>

        {/* ── Right Rail (lg+) ── */}
        <aside className="hidden lg:flex flex-col w-[350px] shrink-0 h-full overflow-y-auto no-scrollbar py-6 pl-8 pr-4 scroll-smooth">
          {/* Search */}
          <SearchUsers />

          {/* Guest Sign-in Prompt (only visible when logged out) */}
          <div className="mt-4">
            <GuestSignInPrompt />
          </div>

          {/* Mindful Tip */}
          <MindfulTip />

          {/* Saved Reflections */}
          <MindfulSaves />

          {/* Subdued Footer — desktop only, tucked at the very bottom */}
          <footer className="mt-auto pt-10 pb-6 px-2 flex flex-col gap-3">
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {["About", "Privacy", "Terms", "Cookies"].map((l) => (
                <Link
                  href={`/${l.toLowerCase()}`}
                  key={l}
                  className="text-[10.5px] font-bold text-muted-foreground hover:text-brand-green transition-colors tracking-wide uppercase opacity-50 hover:opacity-100"
                >
                  {l}
                </Link>
              ))}
            </div>
            <p className="text-[11px] font-medium text-muted-foreground opacity-35 tracking-wide">
              MindFuel · a{" "}
              <a
                href="http://lumynhq.studio"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-brand-green transition-colors opacity-100"
              >
                Lumyn
              </a>{" "}
              product
            </p>
          </footer>
        </aside>
      </div>
    </div>
  );
}
