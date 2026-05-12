/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as any;
  const isIPadOS = nav.platform === "MacIntel" && nav.maxTouchPoints > 1;
  return (/iPad|iPhone|iPod/.test(navigator.userAgent) || isIPadOS) && !nav.MSStream;
}

function isInStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as any;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true
  );
}

const DISMISS_KEY = "mindfuel_pwa_dismiss";
const DISMISS_DAYS = 1; // Show again after 24 hours if dismissed

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Don't show if already installed
    if (isInStandaloneMode()) return;

    // Check if previously dismissed
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const daysSinceDismiss = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismiss < DISMISS_DAYS) return;
    }

    // iOS detection - show prompt after a short delay
    if (isIOS()) {
      const timer = setTimeout(() => setShowIOSPrompt(true), 2000);
      return () => clearTimeout(timer);
    }

    // Android/Chrome install prompt
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShowInstallPrompt(true), 2000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowInstallPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    setShowIOSPrompt(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  if (!mounted) return null;

  const showPrompt = showInstallPrompt || showIOSPrompt;

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-20 left-4 right-4 md:left-auto md:right-8 md:bottom-8 z-[9999] md:w-[400px]"
        >
          <div className="bg-white dark:bg-[#0f171a] border border-border/60 shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-[28px] overflow-hidden p-1.5 backdrop-blur-xl">
            <div className="p-4 flex gap-4 items-center relative">
              {/* App icon */}
              <div className="w-12 h-12 rounded-2xl bg-brand-green/10 flex items-center justify-center shrink-0 overflow-hidden border border-brand-green/20">
                <Image src="/icon-192.png" alt="MindFuel" width={48} height={48} className="w-full h-full object-cover" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-[16px] leading-tight mb-0.5">Install MindFuel</h3>
                <p className="text-[13px] text-muted-foreground leading-snug">
                  {showIOSPrompt 
                    ? "Add to home screen for the full experience."
                    : "Experience mindfulness with our native-like app."}
                </p>
              </div>

              <button onClick={handleDismiss} className="p-2 text-muted-foreground/60 hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-4 pb-4">
              {showIOSPrompt ? (
                <div className="bg-secondary/30 rounded-2xl p-3.5 flex items-center justify-center gap-3 text-[13px] font-medium border border-border/40">
                  <span>Tap</span>
                  <div className="w-8 h-8 bg-white dark:bg-white/10 rounded-lg flex items-center justify-center shadow-sm">
                    <Share className="w-4 h-4 text-blue-500" />
                  </div>
                  <span>then</span>
                  <span className="bg-white/50 dark:bg-white/10 px-2 py-1 rounded-md text-[12px] font-bold">Add to Home Screen</span>
                </div>
              ) : (
                <button
                  onClick={handleInstallClick}
                  className="w-full bg-brand-green hover:bg-brand-green/90 text-white font-bold h-12 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Install Now
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
