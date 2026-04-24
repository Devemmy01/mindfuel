"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, X, Brain, Users, Zap, Quote } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { getTodayPrompt, DailyPrompt } from "@/lib/dailyPrompts";

const ONBOARDING_KEY = "mindfuel_onboarding_seen";

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  subtitle?: string;
  theme: string;
}

const getSteps = (): OnboardingStep[] => {
  const todayPrompt = getTodayPrompt() as DailyPrompt;
  return [
    {
      title: "MindFuel",
      description: "A calm space for meaningful reflections and thoughtful connection.",
      subtitle: "Free from noise. Full of purpose.",
      icon: <Sparkles className="w-8 h-8" />,
      theme: "from-brand-green/20 to-emerald-500/10",
    },
    {
      title: "Pause & Reflect",
      description: "Each day, a new question helps you pause and explore your inner world.",
      subtitle: "Your growth comes naturally.",
      icon: <Brain className="w-8 h-8" />,
      theme: "from-blue-500/20 to-indigo-500/10",
    },
    {
      title: "Shared Wisdom",
      description: "Discover meaningful thoughts from a community of deep thinkers.",
      subtitle: "Connect through substance.",
      icon: <Users className="w-8 h-8" />,
      theme: "from-purple-500/20 to-pink-500/10",
    },
    {
      title: "Today's Prompt",
      description: todayPrompt.question,
      subtitle: "Your first thought is waiting.",
      icon: <Zap className="w-8 h-8" />,
      theme: "from-orange-500/20 to-rose-500/10",
    },
  ];
};

export default function OnboardingOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [todayPrompt, setTodayPrompt] = useState<DailyPrompt | null>(null);

  useEffect(() => {
    const allSteps = getSteps();
    setSteps(allSteps);
    setTodayPrompt(getTodayPrompt());

    const seen = localStorage.getItem(ONBOARDING_KEY);
    if (!seen) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setIsVisible(false);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleDismiss();
    }
  };

  if (!isVisible || steps.length === 0 || !todayPrompt) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-6"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 30 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="relative w-full max-w-[480px] bg-[#0c0c0c] border border-white/10 rounded-[40px] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.5)]"
        >
          {/* Header Theme Gradient */}
          <div className={`absolute top-0 left-0 right-0 h-48 bg-gradient-to-b ${step.theme} opacity-40 blur-3xl -z-10`} />

          <button
            onClick={() => handleDismiss()}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all z-20"
          >
            <X size={20} />
          </button>

          <div className="px-8 pt-12 pb-10 flex flex-col items-center text-center">
            {/* Animated Icon Container */}
            <motion.div 
              key={currentStep}
              initial={{ scale: 0.5, opacity: 0, rotate: -15 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              className="w-20 h-20 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center text-brand-green mb-8 shadow-2xl relative"
            >
              <div className="absolute inset-0 bg-brand-green/20 blur-2xl rounded-full opacity-50" />
              {currentStep === 0 ? (
                <Image src="/splash-logo.png" alt="MindFuel" width={56} height={56} className="relative z-10" />
              ) : (
                <div className="relative z-10 text-brand-green">{step.icon}</div>
              )}
            </motion.div>

            {/* Stepper Indicators */}
            <div className="flex gap-1.5 mb-8">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-500 ${
                    i === currentStep
                      ? "w-8 bg-brand-green"
                      : i < currentStep 
                        ? "w-2 bg-brand-green/40" 
                        : "w-2 bg-white/10"
                  }`}
                />
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4 text-white">
                  {step.title}
                </h2>
                
                {isLastStep ? (
                  <div className="relative group px-4 py-8 mb-8">
                    <Quote className="absolute top-0 left-0 w-8 h-8 text-brand-green/20 -translate-x-2 -translate-y-2" />
                    <p className="text-xl sm:text-2xl font-bold leading-tight text-white/90 italic">
                      &quot;{step.description}&quot;
                    </p>
                    <Quote className="absolute bottom-0 right-0 w-8 h-8 text-brand-green/20 translate-x-2 translate-y-2 rotate-180" />
                  </div>
                ) : (
                  <p className="text-[17px] sm:text-[19px] text-white/60 leading-relaxed mb-10 max-w-[320px] mx-auto font-medium">
                    {step.description}
                  </p>
                )}

                {step.subtitle && (
                  <p className="text-sm text-brand-green font-bold tracking-widest uppercase mb-10 opacity-80">
                    {step.subtitle}
                  </p>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="w-full flex flex-col gap-4">
              {isLastStep ? (
                <Link
                  href={`/create?prompt=${encodeURIComponent(todayPrompt.question)}&promptId=${todayPrompt.id}`}
                  onClick={handleDismiss}
                  className="w-full h-16 flex items-center justify-center gap-3 rounded-2xl font-black text-[17px] bg-brand-green text-white hover:brightness-110 transition-all shadow-[0_10px_30px_rgba(0,191,99,0.3)] press-scale"
                >
                  Share My Thought
                  <ArrowRight size={20} strokeWidth={3} />
                </Link>
              ) : (
                <button
                  onClick={handleNext}
                  className="w-full h-16 flex items-center justify-center gap-3 rounded-2xl font-black text-[17px] bg-white text-black hover:bg-white/90 transition-all shadow-[0_10px_30px_rgba(255,255,255,0.1)] press-scale"
                >
                  Continue
                  <ArrowRight size={20} strokeWidth={3} />
                </button>
              )}
              
              <button
                onClick={() => handleDismiss()}
                className="w-full py-2 text-[14px] font-bold text-white/30 hover:text-white/60 transition-colors tracking-wide"
              >
                SKIP INTRO
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}