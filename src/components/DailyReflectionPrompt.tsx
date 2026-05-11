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

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-secondary/40 border border-border/50 rounded-2xl mx-4 p-4 md:p-6 mb-6 overflow-hidden relative group shadow-sm"
    >
      {/* Decorative elements */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-foreground/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-foreground/[0.02] rounded-full blur-2xl" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="inline-flex items-center gap-2 bg-foreground/10 px-3 py-1.5 rounded-full">
            <p className="text-[11px] font-bold text-foreground/80 tracking-wider uppercase">
              Today&apos;s Reflection
            </p>
          </div>
          {responseCount > 0 && (
            <span className="text-xs font-semibold text-muted-foreground bg-secondary/80 px-2.5 py-1 rounded-full">
              {responseCount} {responseCount === 1 ? "response" : "responses"}
            </span>
          )}
        </div>

        {/* Question */}
        <h2 className="text-xl sm:text-2xl font-bold text-[#f5f5f5] mb-4 leading-snug tracking-tight">
          &quot;{prompt.question}&quot;
        </h2>

        {/* Category badge */}
        <div className="flex items-center gap-2 mb-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/60 border border-border/50">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor:
                  prompt.category === "gratitude"
                    ? "#f97316"
                    : prompt.category === "growth"
                      ? "#06b6d4"
                      : prompt.category === "mindfulness"
                        ? "#10b981"
                        : prompt.category === "reflection"
                          ? "#8b5cf6"
                          : "#6366f1",
              }}
            />
            <span className="text-xs font-medium text-muted-foreground capitalize">
              {prompt.category}
            </span>
          </div>
        </div>

        {/* CTA */}
        <Link
          href={`/create?prompt=${encodeURIComponent(prompt.question)}&promptId=${prompt.id}`}
          className="inline-flex items-center gap-2 mt-4 px-4 py-2.5 bg-[#00a855] text-white rounded-full font-semibold text-sm transition-all hover:bg-[#00a855]/90 hover:shadow-md active:scale-95"
        >
          <span>Share Your Reflection</span>
          <ArrowRight className="w-4 h-4" />
        </Link>

        {/* Or view responses */}
        {responseCount > 0 && (
          <button className="block mt-3 text-xs font-medium text-brand-green hover:text-brand-green/80 transition-colors">
            See {responseCount === 1 ? "response" : "responses"} below
          </button>
        )}
      </div>
    </motion.div>
  );
}
