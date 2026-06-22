"use client";

import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";

export default function AppLandingCard() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <Link
      href="/?view=landing"
      className="group relative mt-5 block shrink-0 overflow-hidden rounded-[1.4rem] border border-brand-green/20 bg-gradient-to-br from-brand-green/[0.13] via-brand-green/[0.04] to-transparent p-4 transition duration-300 hover:-translate-y-0.5 hover:border-brand-green/35"
    >
      <div className="absolute -right-12 -top-12 h-28 w-28 rounded-full bg-brand-green/15 blur-2xl transition group-hover:bg-brand-green/25" />
      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-brand-green/20 bg-brand-green/10 text-brand-green">
            <Sparkles className="h-4 w-4" />
          </span>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-green" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-green">The bigger picture</p>
        <h3 className="mt-1.5 text-[17px] font-black tracking-tight text-foreground">Why we built MindFuel</h3>
        <p className="mt-1.5 text-[12px] leading-[1.15rem] text-muted-foreground">
          Take a quick tour of the ideas and features behind your reflection space.
        </p>
        <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-black text-foreground transition group-hover:text-brand-green">
          Visit our story
        </span>
      </div>
    </Link>
  );
}
