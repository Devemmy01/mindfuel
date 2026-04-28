"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import SearchUsers from "@/components/SearchUsers";
import MindfulTip from "@/components/MindfulTip";
import MindfulSaves from "@/components/MindfulSaves";

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStandalonePage = pathname === "/tip/download";

  if (isStandalonePage) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-brand-green/20 flex justify-center">
      <div className="flex w-full max-w-[1280px] relative">
        {/* ── Left Sidebar (Navbar) ── */}
        <Navbar />

        {/* ── Main Feed Column ── */}
        <main className="flex-grow w-full min-w-0 md:max-w-[600px] md:border-x md:border-border min-h-[100dvh]">
          {children}
        </main>

        {/* ── Right Rail (lg+) ── */}
        <aside className="hidden lg:flex flex-col w-[350px] shrink-0 sticky top-0 h-screen py-6 pl-8 pr-4 overflow-y-auto no-scrollbar scroll-smooth">
          {/* Search */}
          <SearchUsers />

          {/* Mindful Tip */}
          <MindfulTip />

          {/* Saved Reflections */}
          <MindfulSaves />

          {/* Subdued Footer */}
          <footer className="mt-auto pt-10 pb-6 px-2 flex flex-col gap-4">
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {["About", "Privacy", "Terms", "Cookies"].map((l) => (
                <Link
                  href={`/${l.toLowerCase()}`}
                  key={l}
                  className="text-[11px] font-bold text-muted-foreground hover:text-brand-green transition-colors tracking-wide uppercase opacity-70 hover:opacity-100"
                >
                  {l}
                </Link>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <p className="text-[13px] font-bold text-muted-foreground opacity-50 tracking-wide pt-1">
                MindFuel - a{" "}
                <a
                  href="http://lumynhq.studio"
                  className="text-brand-green underline"
                >
                  Lumyn
                </a>{" "}
                product.
              </p>
            </div>
          </footer>
        </aside>
      </div>
    </div>
  );
}
