"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, X, Zap, Quote, Check, Sparkles, Shield } from "lucide-react";
import Link from "next/link";
import { getTodayPrompt, DailyPrompt } from "@/lib/dailyPrompts";
import { useAuth } from "@/providers/AuthProvider";

const ONBOARDING_KEY = "mindfuel_onboarding_seen";

export default function OnboardingOverlay() {
  const { user, login } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [todayPrompt, setTodayPrompt] = useState<DailyPrompt | null>(null);

  useEffect(() => {
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
    if (currentSlide < 4) {
      setCurrentSlide(currentSlide + 1);
    } else {
      handleDismiss();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  if (!isVisible || !todayPrompt) return null;

  const totalSlides = 5;
  const isLastSlide = currentSlide === totalSlides - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#020504]/96 backdrop-blur-xl p-0 md:p-6 lg:p-10 select-none overflow-hidden"
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 40 }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
          className="relative w-full h-[100dvh] max-h-[100dvh] md:h-[90vh] md:max-h-[850px] md:max-w-[1100px] bg-background md:rounded-[40px] border-0 md:border md:border-brand-green/20 shadow-[0_25px_70px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col md:flex-row"
        >
          {/* ── Left Column: Brand Identity Accent & Aesthetic Overlay ── */}
          <div className="hidden md:flex md:w-[45%] bg-gradient-to-tr from-[#00bf63] via-[#00a855] to-emerald-600 relative overflow-hidden flex-col justify-between p-12 text-black">
            {/* Curved organic circular detail overlay */}
            <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-emerald-950/15 blur-2xl pointer-events-none" />
            <div className="absolute -top-10 -left-10 w-60 h-60 rounded-full bg-white/10 blur-xl pointer-events-none animate-float-1" />
            <div className="absolute top-[30%] -right-10 w-48 h-48 rounded-full bg-emerald-800/10 blur-lg pointer-events-none animate-float-2" />

            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-[#03301a] opacity-80 mb-8">
                The Platform
              </p>
              
              {/* Premium leaf brand name overlay matching Image 3 standard */}
              <div className="flex items-center gap-2 select-none">
                <h1 className="text-5xl font-black tracking-tighter text-[#040a07] flex items-center leading-none">
                  mindf<span className="inline-flex text-[44px] text-emerald-950 font-normal leading-none mx-0.5 transform -rotate-12 animate-pulse">🌱</span>el
                </h1>
              </div>

              <div className="w-12 h-1 bg-[#040a07] rounded-full mt-6 opacity-40" />
            </div>

            <div className="z-10">
              <Quote className="w-10 h-10 text-emerald-950/20 mb-4" />
              <h2 className="text-3xl font-black leading-tight text-[#040a07] tracking-tight max-w-[320px]">
                Where your thoughts finally have room to breathe.
              </h2>
            </div>

            <div className="z-10 flex items-center justify-between text-[#03301a]/80 text-xs font-bold tracking-widest">
              <span>MIND-FUEL.APP</span>
              <span>@GETMINDFUELAPP</span>
            </div>
          </div>

          {/* ── Right Column: Interactive Slides ── */}
          <div className="flex-1 flex flex-col justify-between bg-[#030605] relative p-4 sm:p-8 md:p-12 overflow-y-auto no-scrollbar">
            {/* Header control */}
            <div className="flex justify-between items-center z-20">
              {/* Stepper indicators */}
              <div className="flex gap-2">
                {Array.from({ length: totalSlides }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      i === currentSlide
                        ? "w-8 bg-brand-green"
                        : i < currentSlide
                        ? "w-3 bg-brand-green/40"
                        : "w-2 bg-white/10"
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={handleDismiss}
                className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all"
                aria-label="Skip onboarding"
              >
                <X size={18} />
              </button>
            </div>

            {/* Slide Container with high fidelity animations */}
            <div className="flex-grow flex items-center my-4 md:my-8 z-10 min-h-0 overflow-y-auto no-scrollbar">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, x: 25 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -25 }}
                  transition={{ duration: 0.35, ease: [0.21, 0.47, 0.32, 0.98] }}
                  className="w-full"
                >
                  {/* SLIDE 0: Welcome Philosophy quote (Matching Image 1 standard) */}
                  {currentSlide === 0 && (
                    <div className="space-y-4 md:space-y-6">
                      <div className="space-y-3 md:space-y-4 max-w-[480px]">
                        <p className="text-[12px] font-black uppercase tracking-widest text-brand-green">
                          Mindful Philosophy
                        </p>
                        
                        {/* Premium quote recreation from Image 1 */}
                        <div className="relative p-5 sm:p-8 bg-gradient-to-br from-card/80 to-[#040f0a] border border-brand-green/10 rounded-2xl sm:rounded-[32px] overflow-hidden shadow-2xl">
                          <Quote className="absolute top-4 left-4 w-10 h-10 sm:w-12 sm:h-12 text-brand-green/10 -translate-x-1 -translate-y-1 sm:-translate-x-2 sm:-translate-y-2 pointer-events-none" />
                          
                          <h3 className="text-lg sm:text-2xl font-bold tracking-tight text-white leading-snug pt-10">
                            Social media doesn&apos;t have to be{" "}
                            <span className="text-brand-green font-extrabold bg-brand-green/5 px-2 py-0.5 rounded-lg border border-brand-green/10">
                              driven by likes and noise.
                            </span>{" "}
                            It can be a place to think.
                          </h3>
                          
                          <div className="w-8 h-[2px] bg-brand-green rounded-full my-4 sm:my-5" />

                          <p className="text-[12px] sm:text-[14px] text-white/50 leading-relaxed font-medium">
                            MindFuel is built for people who value depth over dopamine — a space for your thoughts, reflections, and ideas to live without the pressure of performance.
                          </p>

                          {/* Detail row at bottom of quote card */}
                          <div className="mt-6 sm:mt-8 pt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-brand-green/60 font-bold tracking-wide">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
                              <span>mindfuel</span>
                            </div>
                            <span>mind-fuel.app</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SLIDE 1: Daily Prompt */}
                  {currentSlide === 1 && (
                    <div className="space-y-4 md:space-y-6">
                      <div className="hidden xs:flex w-10 h-10 sm:w-12 sm:h-12 bg-brand-green/10 border border-brand-green/20 rounded-2xl items-center justify-center text-brand-green shadow-brand-sm">
                        <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>

                      <div className="space-y-1 sm:space-y-2">
                        <p className="text-[12px] font-black uppercase tracking-widest text-brand-green">
                          Daily Prompt
                        </p>
                        <h2 className="text-2xl font-black text-white tracking-tight leading-tight sm:text-3xl md:text-4xl">
                          Try today&apos;s guided reflection
                        </h2>
                        <p className="text-[14px] text-white/55 max-w-[420px] font-medium leading-relaxed">
                          Each day we offer a short prompt to spark deep thinking — use it to write, save, or share a thought.
                        </p>
                      </div>

                      <div className="max-w-[480px] pt-1">
                        <div className="p-4 bg-[#040906] border border-white/5 rounded-2xl">
                          <p className="text-[13px] text-white/60 mb-2">Today&apos;s prompt</p>
                          <h3 className="text-lg sm:text-xl font-bold text-white leading-tight">{todayPrompt.question}</h3>
                          <div className="mt-4 flex gap-3">
                            <Link
                              href={`/create?prompt=${encodeURIComponent(todayPrompt.question)}&promptId=${todayPrompt.id}`}
                              onClick={handleDismiss}
                              className="px-4 py-2 rounded-full bg-brand-green text-white font-bold"
                            >
                              Use this prompt
                            </Link>
                            <button
                              onClick={() => setCurrentSlide(currentSlide + 1)}
                              className="px-4 py-2 rounded-full bg-white text-black font-bold"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SLIDE 2: Privacy & Controls */}
                  {currentSlide === 2 && (
                    <div className="space-y-4 md:space-y-6">
                      <div className="hidden xs:flex w-10 h-10 sm:w-12 sm:h-12 bg-brand-green/10 border border-brand-green/20 rounded-2xl items-center justify-center text-brand-green shadow-brand-sm">
                        <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>

                      <div className="space-y-1 sm:space-y-2">
                        <p className="text-[12px] font-black uppercase tracking-widest text-brand-green">
                          Sharing
                        </p>
                        <h2 className="text-2xl font-black text-white tracking-tight leading-tight sm:text-3xl md:text-4xl">
                          You can share when you want, how you want.
                        </h2>
                        <p className="text-[13px] sm:text-[14px] text-white/55 max-w-[400px] font-medium leading-relaxed">
                          
                        </p>
                      </div>

                      <div className="space-y-3 max-w-[480px] pt-1">
                        <div className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-brand-green/80 mt-1" />
                          <div>
                            <h4 className="text-[14px] font-black text-white">Post sharing</h4>
                            <p className="text-[12px] text-white/50">Share a reflection publicly.</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-brand-green/80 mt-1" />
                          <div>
                            <h4 className="text-[14px] font-black text-white">Download as card</h4>
                            <p className="text-[12px] text-white/50">Download your post as a card to share offline.</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-brand-green/80 mt-1" />
                          <div>
                            <h4 className="text-[14px] font-black text-white">Repost</h4>
                            <p className="text-[12px] text-white/50">Amplify meaningful reflections by reposting them to your feed.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SLIDE 3: What You Get checklist (Matching Image 2 values style) */}
                  {currentSlide === 3 && (
                    <div className="space-y-4 md:space-y-6">
                      <div className="hidden xs:flex w-10 h-10 sm:w-12 sm:h-12 bg-brand-green/10 border border-brand-green/20 rounded-2xl items-center justify-center text-brand-green shadow-brand-sm">
                        <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>

                      <div className="space-y-1 sm:space-y-2">
                        <p className="text-[12px] font-black uppercase tracking-widest text-brand-green">
                          What You Get
                        </p>
                        <h2 className="text-2xl font-black text-white tracking-tight leading-tight sm:text-3xl md:text-4xl">
                          Sourced for quality, not metrics
                        </h2>
                      </div>

                      {/* Bullet list recreating details of Image 2 */}
                      <div className="space-y-3 sm:space-y-5 max-w-[480px] pt-1">
                        <div className="flex items-start gap-3 sm:gap-4">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-brand-green/10 border border-brand-green/20 flex items-center justify-center mt-1 flex-shrink-0">
                            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-brand-green shadow-[0_0_8px_var(--brand-green)]" />
                          </div>
                          <div>
                            <h4 className="text-[14px] sm:text-[15px] font-black text-white leading-tight">No algorithm pressure</h4>
                            <p className="text-[12px] sm:text-[13px] text-white/50 leading-snug mt-1 font-medium">Post because it matters, not because it performs.</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 sm:gap-4">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-brand-green/10 border border-brand-green/20 flex items-center justify-center mt-1 flex-shrink-0">
                            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-brand-green shadow-[0_0_8px_var(--brand-green)]" />
                          </div>
                          <div>
                            <h4 className="text-[14px] sm:text-[15px] font-black text-white leading-tight">Curate & reflect</h4>
                            <p className="text-[12px] sm:text-[13px] text-white/50 leading-snug mt-1 font-medium">Save ideas, share reflections, build your feed.</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 sm:gap-4">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-brand-green/10 border border-brand-green/20 flex items-center justify-center mt-1 flex-shrink-0">
                            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-brand-green shadow-[0_0_8px_var(--brand-green)]" />
                          </div>
                          <div>
                            <h4 className="text-[14px] sm:text-[15px] font-black text-white leading-tight">Authentic connection</h4>
                            <p className="text-[12px] sm:text-[13px] text-white/50 leading-snug mt-1 font-medium">Real people, real thoughts — no performance pressure.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SLIDE 4: Interactive Authentication Gate */}
                  {currentSlide === 4 && (
                    <div className="space-y-4 md:space-y-6">
                      <div className="hidden xs:flex w-10 h-10 sm:w-12 sm:h-12 bg-brand-green/10 border border-brand-green/20 rounded-2xl items-center justify-center text-brand-green shadow-brand-sm">
                        <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>

                      <div className="space-y-1 sm:space-y-2">
                        <p className="text-[12px] font-black uppercase tracking-widest text-brand-green">
                          Final Step
                        </p>
                        <h2 className="text-2xl font-black text-white tracking-tight leading-tight sm:text-3xl md:text-4xl">
                          Join the community
                        </h2>
                        <p className="text-[13px] sm:text-[14px] text-white/55 max-w-[420px] font-medium leading-relaxed">
                          Secure your thoughts in a dedicated notebook database. Share reflection collections with like-minded thinkers.
                        </p>
                      </div>

                      {user ? (
                        <div className="max-w-[450px] p-5 sm:p-6 bg-brand-green/5 border border-brand-green/20 rounded-2xl sm:rounded-[28px] flex items-center gap-3 sm:gap-4 animate-fade-up">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-brand-green/15 flex items-center justify-center text-brand-green flex-shrink-0">
                            <Check size={20} className="stroke-[3px]" />
                          </div>
                          <div>
                            <h4 className="font-black text-white text-[14px] sm:text-[15px] leading-tight">Authentication Synced!</h4>
                            <p className="text-[11px] sm:text-[12px] text-white/50 mt-1 font-medium font-sans">
                              Logged in as <span className="text-white font-bold">{user.displayName}</span>. Let&apos;s enter your reflections.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="max-w-[450px] p-4 sm:p-5 bg-[#050e0a] border border-brand-green/15 rounded-2xl sm:rounded-3xl space-y-3 sm:space-y-4">
                          <button
                            onClick={login}
                            className="w-full h-12 sm:h-14 bg-white hover:bg-neutral-100 active:scale-[0.98] transition-all rounded-full flex items-center justify-center gap-2.5 sm:gap-3 px-4 sm:px-6 shadow-xl"
                          >
                            <svg className="w-4.5 h-4.5 sm:w-5 sm:h-5 flex-shrink-0" viewBox="0 0 24 24">
                              <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                              />
                              <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                              />
                              <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                              />
                              <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                              />
                            </svg>
                            <span className="font-extrabold text-[13px] sm:text-[14px] text-[#030605]">
                              Connect with Google
                            </span>
                          </button>
                          
                          <p className="text-[10px] sm:text-[11px] text-white/40 text-center leading-relaxed font-medium">
                            By joining, you secure automatic data backup. No passwords to remember. Fully encrypted.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Bottom Controls */}
            <div className="flex items-center justify-between gap-4 z-20 pt-6 border-t border-white/5">
              {currentSlide > 0 ? (
                <button
                  onClick={handlePrev}
                  className="px-6 py-3.5 rounded-full text-[13px] font-bold text-white/50 hover:text-white transition-colors"
                >
                  PREVIOUS
                </button>
              ) : (
                <button
                  onClick={handleDismiss}
                  className="px-6 py-3.5 rounded-full text-[13px] font-bold text-white/30 hover:text-white/60 transition-colors"
                >
                  SKIP INTRO
                </button>
              )}

              {isLastSlide ? (
                <Link
                  href={`/create?prompt=${encodeURIComponent(todayPrompt.question)}&promptId=${todayPrompt.id}`}
                  onClick={handleDismiss}
                  className="px-4                                                                                                             md:px-8 h-14 flex items-center justify-center gap-2 rounded-full font-black text-[14px] bg-green-600 text-white hover:bg-green-700 transition-all press-scale"
                >
                  Share My Thought
                  <ArrowRight size={16} strokeWidth={3} />
                </Link>
              ) : (
                <button
                  onClick={handleNext}
                  className="px-8 h-14 flex items-center justify-center gap-2 rounded-full font-black text-[14px] bg-green-600 text-white hover:bg-green-700 transition-all press-scale"
                >
                  Continue
                  <ArrowRight size={16} strokeWidth={3} />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>