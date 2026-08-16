"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { getTodayPrompt } from "@/lib/dailyPrompts";

export interface ActiveReflector {
  firebaseId: string;
  name: string;
  username?: string;
  image?: string;
}

interface DailyReflectionPromptProps {
  reflectors?: ActiveReflector[];
}

function ReflectorAvatar({
  reflector,
  size = 36,
}: {
  reflector: ActiveReflector;
  size?: number;
}) {
  const [imageFailed, setImageFailed] = React.useState(false);
  const showImage = Boolean(
    reflector.image && !reflector.image.startsWith("#") && !imageFailed,
  );

  return showImage ? (
    <Image
      src={reflector.image!}
      alt={reflector.name}
      width={size}
      height={size}
      unoptimized
      onError={() => setImageFailed(true)}
      className="shrink-0 rounded-full border-2 border-surface object-cover"
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      className="flex shrink-0 items-center justify-center rounded-full border-2 border-surface bg-[#10261b] font-bold text-emerald-300"
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.32) }}
      aria-label={reflector.name}
    >
      {reflector.name?.[0]?.toUpperCase() || "M"}
    </span>
  );
}

export default function DailyReflectionPrompt({
  reflectors = [],
}: DailyReflectionPromptProps) {
  const prompt = getTodayPrompt();

  if (!prompt) return null;

  const categoryColors: Record<
    string,
    { dot: string; bg: string; text: string }
  > = {
    gratitude: {
      dot: "#f97316",
      bg: "bg-orange-500/10",
      text: "text-orange-400",
    },
    growth: { dot: "#06b6d4", bg: "bg-cyan-500/10", text: "text-cyan-400" },
    mindfulness: {
      dot: "#10b981",
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
    },
    reflection: {
      dot: "#8b5cf6",
      bg: "bg-purple-500/10",
      text: "text-purple-400",
    },
    default: {
      dot: "#6366f1",
      bg: "bg-indigo-500/10",
      text: "text-indigo-400",
    },
  };

  const catColors =
    categoryColors[prompt.category as keyof typeof categoryColors] ??
    categoryColors.default;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="group relative z-20 mx-4 mb-8 mt-2 overflow-visible rounded-3xl border border-brand-green/20 bg-surface"
    >
      <div className="relative z-10 p-5 md:p-7">
        {/* Header row */}
        <div className="flex items-center justify-between mb-5">
          <div className="inline-flex items-center gap-2 bg-brand-green/10 border border-brand-green/20 px-3.5 py-1.5 rounded-full">
            <p className="text-[11px] font-black text-brand-green">
              Today&apos;s Reflection
            </p>
          </div>
        </div>

        {/* Question */}
        <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-5 leading-snug tracking-tight">
          &ldquo;{prompt.question}&rdquo;
        </h2>

        {/* Category + meta row */}
        <div className="mb-6 flex flex-col items-start gap-3">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/40 ${catColors.bg}`}
          >
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: catColors.dot }}
            />
            <span
              className={`text-[12px] font-semibold capitalize ${catColors.text}`}
            >
              {prompt.category}
            </span>
          </div>
          {reflectors.length > 0 && (
            <div
              className="group/reflectors relative flex items-center"
              tabIndex={0}
              aria-label={`${Math.min(reflectors.length, 5)} active reflectors`}
            >
              <div className="flex -space-x-2.5">
                {reflectors.slice(0, 5).map((reflector) => (
                  <ReflectorAvatar
                    key={reflector.firebaseId}
                    reflector={reflector}
                  />
                ))}
              </div>
              <span className="ml-3 text-[11px] font-medium text-muted-foreground">
                reflecting consistently
              </span>
              <div
                role="tooltip"
                className="pointer-events-none absolute left-0 top-[calc(100%+12px)] z-[80] w-[292px] translate-y-1 rounded-2xl border border-line-strong bg-surface-raised p-4 opacity-0 transition-all duration-150 group-hover/reflectors:translate-y-0 group-hover/reflectors:opacity-100 group-focus/reflectors:translate-y-0 group-focus/reflectors:opacity-100"
              >
                <strong className="block text-[13px] font-bold text-white">
                  Consistent reflectors
                </strong>
                <p className="mt-1 text-[11px] leading-relaxed text-white/55">
                  Five people actively making reflection a habit.
                </p>
                <div className="mt-3 space-y-2.5">
                  {reflectors.slice(0, 5).map((item) => (
                    <div
                      key={item.firebaseId}
                      className="flex items-center gap-2.5"
                    >
                      <ReflectorAvatar reflector={item} size={30} />
                      <span className="min-w-0 truncate text-[11px] font-semibold text-white/85">
                        {item.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <Link
          href={`/create?prompt=${encodeURIComponent(prompt.question)}&promptId=${prompt.id}`}
          className="group/btn inline-flex items-center gap-2.5 px-5 py-3 bg-[#00a855] hover:bg-[#009950] text-white rounded-full font-bold text-[14px] transition-all hover:-translate-y-0.5 active:scale-95"
        >
          <span>Share Your Reflection</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-0.5" />
        </Link>
      </div>
    </motion.div>
  );
}
