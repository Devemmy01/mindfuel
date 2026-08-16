"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info, Flame, X } from "lucide-react";
import { getStreakMilestoneMessage } from "@/lib/streakUtils";

interface StreakDisplayProps {
  streakDays: number;
  showMilestone?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Displays user's reflection streak with celebration animations
 * and an informative popover.
 */
export default function StreakDisplay({
  streakDays,
  showMilestone = false,
  size = "md",
  className = "",
}: StreakDisplayProps) {
  const [showInfo, setShowInfo] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);

  const sizeStyles = {
    sm: "text-[12px] px-2.5 py-1 gap-1.5",
    md: "text-[14px] px-3.5 py-1.5 gap-2",
    lg: "text-[16px] px-5 py-2.5 gap-2.5",
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 20,
  };

  const milestone = getStreakMilestoneMessage(streakDays);
  const isMilestone = milestone !== null;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (infoRef.current && !infoRef.current.contains(event.target as Node)) {
        setShowInfo(false);
      }
    };
    if (showInfo) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showInfo]);

  return (
    <div className={`relative inline-block ${className}`} ref={infoRef}>
      <div className="flex flex-col gap-2">
        <motion.button
          onClick={() => setShowInfo(!showInfo)}
          className={`
            group relative overflow-hidden inline-flex items-center rounded-full font-bold transition-all
            ${streakDays > 0 
              ? "bg-gradient-to-r from-brand-green/10 to-emerald-500/10 border border-brand-green/20 text-[#00a855] dark:text-brand-green hover:border-brand-green/40" 
              : "bg-secondary/50 border border-border text-muted-foreground hover:bg-secondary"}
            ${sizeStyles[size]}
            shadow-sm hover:shadow-md active:scale-95
          `}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
        >
          {/* Animated background glow for active streaks */}
          {streakDays > 0 && (
            <div className="absolute inset-0 bg-gradient-to-r from-brand-green/5 to-emerald-500/5 animate-pulse" />
          )}

          <div className="relative flex items-center gap-1.5">
            {streakDays > 0 ? (
              <motion.div
                animate={isMilestone ? { 
                  scale: [1, 1.2, 1],
                  filter: ["drop-shadow(0 0 0px #00bf63)", "drop-shadow(0 0 8px #00bf63)", "drop-shadow(0 0 0px #00bf63)"]
                } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Flame size={iconSizes[size]} className="fill-brand-green" strokeWidth={2.5} />
              </motion.div>
            ) : (
              <Flame size={iconSizes[size]} className="text-muted-foreground/50" />
            )}
            
            <span className="tracking-tight">
              {streakDays === 0 ? "Start a streak" : `${streakDays} Day Streak`}
            </span>
            
            <Info size={iconSizes[size] - 2} className="opacity-40 group-hover:opacity-100 transition-opacity ml-0.5" />
          </div>
        </motion.button>

        {showMilestone && isMilestone && (
          <motion.p
            className="text-[12px] text-[#00a855] dark:text-brand-green font-bold flex items-center gap-1 ml-1"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Flame size={12} />
            {milestone}
          </motion.p>
        )}
      </div>

      {/* Info Modal / Popover */}
      <AnimatePresence>
        {showInfo && (
          <>
            {/* Mobile Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInfo(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] md:hidden"
            />

            <motion.div
              initial={{ 
                opacity: 0, 
                y: window.innerWidth < 768 ? 100 : 10, 
                scale: window.innerWidth < 768 ? 1 : 0.95 
              }}
              animate={{ 
                opacity: 1, 
                y: 0, 
                scale: 1 
              }}
              exit={{ 
                opacity: 0, 
                y: window.innerWidth < 768 ? 100 : 10, 
                scale: window.innerWidth < 768 ? 1 : 0.95 
              }}
              className={`
                z-[9999] overflow-hidden
                ${window.innerWidth < 768
                  ? "fixed bottom-0 left-0 right-0 rounded-t-[32px] p-6 pb-[calc(2.5rem+env(safe-area-inset-bottom))] bg-surface-raised border-t border-border/40 shadow-[0_-20px_50px_rgba(0,0,0,0.3)]"
                  : "absolute left-0 mt-3 w-72 bg-popover popover-solid border border-border shadow-2xl rounded-2xl p-5"
                }
              `}
            >
              {/* Background decorative element */}
              <div className="absolute -top-12 -right-12 w-24 h-24 bg-brand-green/10 rounded-full blur-2xl" />
              
              {/* Mobile handle */}
              <div className="md:hidden w-12 h-1.5 bg-border/40 rounded-full mx-auto mb-6" />

              <div className="relative">
                <div className="flex items-center justify-between mb-4 md:mb-3">
                  <div className="flex items-center gap-3 md:gap-2">
                    <div className="w-10 h-10 md:w-8 md:h-8 rounded-xl md:rounded-lg bg-brand-green/10 flex items-center justify-center">
                      <Flame size={window.innerWidth < 768 ? 22 : 18} className="text-brand-green" />
                    </div>
                    <h4 className="font-bold text-[18px] md:text-[15px]">Reflection Streak</h4>
                  </div>
                  <button 
                    onClick={() => setShowInfo(false)}
                    className="p-2 md:p-1 hover:bg-secondary rounded-xl md:rounded-md transition-colors"
                  >
                    <X size={window.innerWidth < 768 ? 20 : 14} />
                  </button>
                </div>
                
                <div className="space-y-4 md:space-y-3">
                  <p className="text-[15px] md:text-[13px] text-foreground/80 leading-relaxed">
                    Your streak reflects your consistency in daily mindfulness. 
                    <span className="font-bold text-brand-green"> Share a thought every day</span> to keep the flame alive!
                  </p>
                  
                  <div className="bg-secondary/40 rounded-2xl md:rounded-xl p-4 md:p-3 border border-border/50">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 md:mb-1.5">How it works</h5>
                    <ul className="space-y-3 md:space-y-2">
                      <li className="flex items-start gap-3 md:gap-2 text-[14px] md:text-[12px]">
                        <div className="mt-1.5 md:mt-1 w-1.5 h-1.5 md:w-1 md:h-1 rounded-full bg-brand-green shrink-0" />
                        <span>Reflect today to increase your streak.</span>
                      </li>
                      <li className="flex items-start gap-3 md:gap-2 text-[14px] md:text-[12px]">
                        <div className="mt-1.5 md:mt-1 w-1.5 h-1.5 md:w-1 md:h-1 rounded-full bg-brand-green shrink-0" />
                        <span>Missing a single day resets it to zero.</span>
                      </li>
                    </ul>
                  </div>
  
                  <div className="flex items-center gap-3 md:gap-2 pt-1">
                    <div className="flex -space-x-1.5 md:-space-x-1">
                      {[3, 7, 30].map((m) => (
                        <div key={m} className="w-8 h-8 md:w-6 md:h-6 rounded-full bg-background border border-border flex items-center justify-center text-[10px] md:text-[9px] font-bold" title={`${m} day milestone`}>
                          {m}
                        </div>
                      ))}
                    </div>
                    <span className="text-[13px] md:text-[11px] text-muted-foreground font-medium">Unlock milestone badges</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
