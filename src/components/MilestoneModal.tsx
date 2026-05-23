"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getMilestoneById, TIER_COLORS } from "@/lib/milestones";

interface MilestoneModalProps {
  milestones: Array<{ id: string; label: string; emoji: string; description: string; tier: string }>;
  onClose: () => void;
}

// Confetti particle component
function Particle({ style }: { style: React.CSSProperties }) {
  return <div className="absolute w-2 h-2 rounded-full pointer-events-none" style={style} />;
}

const PARTICLE_COLORS = ["#00bf63", "#34d399", "#fbbf24", "#f97316", "#60a5fa", "#a78bfa", "#fb7185"];

export default function MilestoneModal({ milestones, onClose }: MilestoneModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [particles, setParticles] = useState<React.CSSProperties[]>([]);

  const current = milestones[currentIndex];
  const mileDef = getMilestoneById(current?.id);
  const tier = (mileDef?.tier || "bronze") as keyof typeof TIER_COLORS;
  const colors = TIER_COLORS[tier];

  // Generate confetti on mount and on each milestone
  useEffect(() => {
    const generated = Array.from({ length: 28 }, (_, i) => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 60}%`,
      backgroundColor: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
      transform: `scale(${0.5 + Math.random()})`,
      opacity: 0.8 + Math.random() * 0.2,
      animation: `milestoneFloat ${1.5 + Math.random() * 2}s ease-in-out ${Math.random() * 0.5}s infinite alternate`,
    }));
    setParticles(generated);
  }, [currentIndex]);

  const handleNext = () => {
    if (currentIndex < milestones.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      onClose();
    }
  };

  if (!current) return null;

  const isLast = currentIndex === milestones.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        key="milestone-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
        onClick={onClose}
      >
        <motion.div
          key={`milestone-card-${current.id}`}
          initial={{ opacity: 0, scale: 0.7, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -20 }}
          transition={{ type: "spring", damping: 18, stiffness: 260 }}
          className="relative w-full max-w-sm bg-[#0a0f0b] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Ambient particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {particles.map((style, i) => (
              <Particle key={i} style={style} />
            ))}
          </div>

          {/* Top tier glow strip */}
          <div className={`h-1 w-full ${colors.bg.replace("/10", "")} opacity-60`} />

          {/* Content */}
          <div className="relative px-8 pt-10 pb-8 flex flex-col items-center text-center gap-5">
            {/* Badge circle */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 10, stiffness: 200, delay: 0.15 }}
              className={`w-28 h-28 rounded-full ${colors.bg} border-2 ${colors.border} ${colors.glow} flex items-center justify-center`}
            >
              <span className="text-6xl select-none">{current.emoji}</span>
            </motion.div>

            {/* Tier badge */}
            <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
              {tier} milestone
            </span>

            {/* Text */}
            <div className="space-y-2">
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="text-[26px] font-black text-white tracking-tight leading-tight"
              >
                {current.label}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="text-[14px] text-white/60 leading-relaxed"
              >
                {current.description}
              </motion.p>
            </div>

            {/* Progress dots if multiple */}
            {milestones.length > 1 && (
              <div className="flex gap-1.5">
                {milestones.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i === currentIndex ? `w-4 ${colors.bg.replace("/10", "")}/80` : "w-1.5 bg-white/20"
                    }`}
                  />
                ))}
              </div>
            )}

            {/* CTA button */}
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              onClick={handleNext}
              className={`w-full py-4 rounded-2xl font-black text-[15px] tracking-wide text-white transition-all active:scale-95 ${
                tier === "diamond"
                  ? "bg-brand-green hover:bg-brand-green/90 shadow-[0_4px_20px_rgba(0,191,99,0.4)]"
                  : tier === "gold"
                  ? "bg-yellow-500 hover:bg-yellow-500/90 shadow-[0_4px_20px_rgba(234,179,8,0.3)]"
                  : tier === "silver"
                  ? "bg-slate-400 hover:bg-slate-400/90 shadow-[0_4px_20px_rgba(148,163,184,0.2)]"
                  : "bg-orange-500 hover:bg-orange-500/90 shadow-[0_4px_20px_rgba(249,115,22,0.3)]"
              }`}
            >
              {isLast ? "🎉 Awesome!" : `Next (${currentIndex + 2}/${milestones.length})`}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>

      <style jsx global>{`
        @keyframes milestoneFloat {
          0%   { transform: translateY(0px) rotate(0deg); }
          100% { transform: translateY(-18px) rotate(15deg); }
        }
      `}</style>
    </AnimatePresence>
  );
}
