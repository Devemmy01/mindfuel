"use client";

import React, { useState } from "react";
import { MILESTONES, TIER_COLORS, MilestoneDefinition } from "@/lib/milestones";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Lock, X, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

interface EarnedMilestone {
  id: string;
  earnedAt: string;
}

interface MilestonesGridProps {
  earnedMilestones: EarnedMilestone[];
}

const ZEN_MASTER_TOTAL = MILESTONES.length;

export default function MilestonesGrid({ earnedMilestones }: MilestonesGridProps) {
  const [selected, setSelected] = useState<{ milestone: MilestoneDefinition; earnedAt?: string } | null>(null);
  const [isOpen, setIsOpen] = useState(true);

  const earnedMap = new Map(earnedMilestones.map((m) => [m.id, m.earnedAt]));
  const earnedCount = earnedMap.size;
  const isZenMaster = earnedCount >= ZEN_MASTER_TOTAL;

  const groupedByTier = {
    diamond: MILESTONES.filter((m) => m.tier === "diamond"),
    gold:    MILESTONES.filter((m) => m.tier === "gold"),
    silver:  MILESTONES.filter((m) => m.tier === "silver"),
    bronze:  MILESTONES.filter((m) => m.tier === "bronze"),
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4 px-1">
        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className="flex items-center gap-2 text-left group"
          aria-expanded={isOpen}
          aria-controls="milestones-panel"
        >
          <h3 className="text-[12px] font-black text-white/40 uppercase tracking-[0.15em]">
            Milestones
          </h3>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-white/30 group-hover:text-brand-green transition-colors" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white/30 group-hover:text-brand-green transition-colors" />
          )}
        </button>
        <span className="text-[11px] font-bold text-white/30">
          {earnedCount}/{ZEN_MASTER_TOTAL} earned
        </span>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id="milestones-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            {/* Progress bar */}
            <div className="h-1 w-full bg-white/5 rounded-full mb-6 overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${isZenMaster ? "bg-gradient-to-r from-green-600 via-emerald-400 to-green-500 shadow-[0_0_14px_rgba(0,191,99,0.35)]" : "bg-green-500 shadow-[0_0_12px_rgba(0,191,99,0.25)]"} transition-[width] duration-700 ease-out`}
                style={{ width: `${(earnedCount / ZEN_MASTER_TOTAL) * 100}%` }}
              />
            </div>

            {/* Zen Master Reward Card */}
            {isZenMaster && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="relative mb-8 overflow-hidden rounded-3xl border border-brand-green/30 bg-gradient-to-br from-brand-green/10 via-purple-500/5 to-brand-green/5 p-5 shadow-[0_0_40px_rgba(0,191,99,0.15)]"
              >
                <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{
                  background: "conic-gradient(from 0deg, transparent 0%, rgba(0,191,99,0.06) 25%, transparent 50%, rgba(167,139,250,0.06) 75%, transparent 100%)",
                  animation: "spin 8s linear infinite",
                }} />
                <div className="relative flex items-center gap-4">
                  <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                      style={{
                        background: "conic-gradient(from 0deg, #00bf63, #a78bfa, #00bf63)",
                        padding: "2px",
                      }}
                    >
                      <div className="w-full h-full rounded-full bg-[#050e0a] flex items-center justify-center">
                        🧘
                      </div>
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-brand-green rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(0,191,99,0.8)]">
                      <CheckCircle2 className="w-3 h-3 text-black" strokeWidth={3} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-green/70 mb-0.5">Achievement Unlocked</p>
                    <h4 className="text-[18px] font-black text-white mb-1">Zen Master 🌿</h4>
                    <p className="text-[12px] text-white/50 leading-relaxed">
                      You&apos;ve earned every milestone. Your glowing aura is now visible on all your reflections across the feed.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Tier groups */}
            {(Object.entries(groupedByTier) as [keyof typeof groupedByTier, typeof MILESTONES[number][]][]).map(([tier, milestones]) => {
              const colors = TIER_COLORS[tier];
              const tierEarned = milestones.filter((m) => earnedMap.has(m.id)).length;

              return (
                <div key={tier} className="mb-6 last:mb-0">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-[10px] font-black uppercase tracking-[0.18em] ${colors.text} opacity-70`}>
                      {tier}
                    </span>
                    <span className="text-[10px] text-white/20 font-medium">
                      {tierEarned}/{milestones.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {milestones.map((milestone, i) => {
                      const isEarned = earnedMap.has(milestone.id);
                      const earnedAt = earnedMap.get(milestone.id);

                      return (
                        <motion.button
                          key={milestone.id}
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.04, duration: 0.3 }}
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setSelected({ milestone, earnedAt })}
                          className={`
                            relative flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all text-left cursor-pointer
                            ${isEarned
                              ? `${colors.bg} ${colors.border} ${colors.glow}`
                              : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04]"
                            }
                          `}
                        >
                          <span className={`text-3xl select-none transition-all ${!isEarned ? "grayscale opacity-25" : ""}`}>
                            {milestone.emoji}
                          </span>

                          <span className={`text-[10px] font-bold text-center leading-tight ${isEarned ? "text-white/80" : "text-white/20"}`}>
                            {milestone.label}
                          </span>

                          {!isEarned && (
                            <div className="absolute inset-0 flex items-end justify-end p-2 pointer-events-none">
                              <Lock className="w-3 h-3 text-white/15" />
                            </div>
                          )}

                          {isEarned && (
                            <div className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-current ${colors.text}`} />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Badge Detail Modal */}
      <AnimatePresence>
        {selected && (() => {
          const { milestone, earnedAt } = selected;
          const isEarned = earnedMap.has(milestone.id);
          const colors = TIER_COLORS[milestone.tier];
          return (
            <motion.div
              key="badge-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
              onClick={() => setSelected(null)}
            >
              <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 40, scale: 0.95 }}
                transition={{ type: "spring", damping: 28, stiffness: 350 }}
                onClick={(e) => e.stopPropagation()}
                className={`relative w-full max-w-sm rounded-3xl border overflow-hidden shadow-2xl
                  ${isEarned ? `${colors.bg} ${colors.border} ${colors.glow}` : "bg-[#050e0a] border-white/10"}
                `}
              >
                {/* Close button */}
                <button
                  onClick={() => setSelected(null)}
                  className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors z-10"
                >
                  <X className="w-4 h-4 text-white/60" />
                </button>

                <div className="p-6 flex flex-col items-center text-center gap-4">
                  {/* Badge emoji */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 400 }}
                    className={`text-6xl select-none ${!isEarned ? "grayscale opacity-30" : ""}`}
                  >
                    {milestone.emoji}
                  </motion.div>

                  {/* Tier pill */}
                  <span className={`inline-block text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full ${colors.bg} ${colors.border} border ${colors.text}`}>
                    {milestone.tier}
                  </span>

                  {/* Title */}
                  <div>
                    <h3 className="text-[20px] font-black text-white mb-1">{milestone.label}</h3>
                    <p className="text-[13px] text-white/50 leading-relaxed">{milestone.description}</p>
                  </div>

                  {/* Requirement box */}
                  <div className="w-full bg-white/[0.03] border border-white/5 rounded-2xl p-4 text-left">
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">How to Earn</p>
                    <p className="text-[14px] font-semibold text-white/80 leading-snug">{milestone.requirement}</p>
                  </div>

                  {/* Earned status */}
                  {isEarned ? (
                    <div className={`w-full flex items-center gap-2.5 justify-center p-3 rounded-2xl ${colors.bg} border ${colors.border}`}>
                      <CheckCircle2 className={`w-4 h-4 shrink-0 ${colors.text}`} />
                      <span className={`text-[13px] font-bold ${colors.text}`}>
                        Earned on {earnedAt ? format(new Date(earnedAt), "MMM d, yyyy") : "—"}
                      </span>
                    </div>
                  ) : (
                    <div className="w-full flex items-center gap-2.5 justify-center p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                      <Lock className="w-4 h-4 text-white/20 shrink-0" />
                      <span className="text-[13px] font-medium text-white/30">Not yet earned</span>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
