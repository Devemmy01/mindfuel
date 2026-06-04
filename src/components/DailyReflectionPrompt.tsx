"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { getTodayPrompt } from "@/lib/dailyPrompts";

interface DailyReflectionPromptProps {
  responseCount?: number;
}

export default function DailyReflectionPrompt({
  responseCount = 0,
}: DailyReflectionPromptProps) {
  const prompt = getTodayPrompt();

  if (!prompt) return null;

  const categoryColors: Record<string, { dot: string; bg: string; text: string }> = {
    gratitude:    { dot: "#f97316", bg: "bg-orange-500/10",  text: "text-orange-400"  },
    growth:       { dot: "#06b6d4", bg: "bg-cyan-500/10",    text: "text-cyan-400"    },
    mindfulness:  { dot: "#10b981", bg: "bg-emerald-500/10", text: "text-emerald-400" },
    reflection:   { dot: "#8b5cf6", bg: "bg-purple-500/10",  text: "text-purple-400"  },
    default:      { dot: "#6366f1", bg: "bg-indigo-500/10",  text: "text-indigo-400"  },
  };

  const catColors =
    categoryColors[prompt.category as keyof typeof categoryColors] ??
    categoryColors.default;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="relative mx-4 mb-8 mt-2 overflow-hidden rounded-3xl border border-brand-green/20 bg-gradient-to-br from-brand-green/[0.07] via-secondary/30 to-secondary/10 shadow-[0_4px_32px_rgba(0,191,99,0.08)] group"
    >
      {/* Ambient glow orbs */}
      <div className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full bg-brand-green/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 w-36 h-36 rounded-full bg-foreground/[0.02] blur-2xl" />

      <div className="relative z-10 p-5 md:p-7">
        {/* Header row */}
        <div className="flex items-center justify-between mb-5">
          <div className="inline-flex items-center gap-2 bg-brand-green/10 border border-brand-green/20 px-3.5 py-1.5 rounded-full">
            <p className="text-[11px] font-black text-brand-green tracking-widest uppercase">
              Today&apos;s Reflection
            </p>
          </div>

          {responseCount > 0 && (
            <span className="text-[12px] font-semibold text-muted-foreground bg-secondary/80 border border-border/50 px-3 py-1 rounded-full">
              {responseCount} {responseCount === 1 ? "reflection" : "reflections"}
            </span>
          )}
        </div>

        {/* Question */}
        <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-5 leading-snug tracking-tight">
          &ldquo;{prompt.question}&rdquo;
        </h2>

        {/* Category + meta row */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/40 ${catColors.bg}`}
          >
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: catColors.dot }}
            />
            <span className={`text-[12px] font-semibold capitalize ${catColors.text}`}>
              {prompt.category}
            </span>
          </div>

          {responseCount > 0 && (
            <span className="text-[12px] text-muted-foreground/70">
              · {responseCount} {responseCount === 1 ? "person reflecting" : "people reflecting"}
            </span>
          )}
        </div>

        {/* CTA */}
        <Link
          href={`/create?prompt=${encodeURIComponent(prompt.question)}&promptId=${prompt.id}`}
          className="group/btn inline-flex items-center gap-2.5 px-5 py-3 bg-[#00a855] hover:bg-[#009950] text-white rounded-full font-bold text-[14px] transition-all shadow-[0_4px_16px_rgba(0,168,85,0.35)] hover:shadow-[0_6px_20px_rgba(0,168,85,0.45)] hover:-translate-y-0.5 active:scale-95"
        >
          <span>Share Your Reflection</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-0.5" />
        </Link>

        {/* Secondary: see responses */}
        {responseCount > 0 && (
          <p className="mt-3 text-[12px] font-medium text-brand-green/60 hover:text-brand-green transition-colors cursor-pointer">
            See {responseCount} {responseCount === 1 ? "reflection" : "reflections"} below ↓
          </p>
        )}
      </div>
    </motion.div>
  );
}
