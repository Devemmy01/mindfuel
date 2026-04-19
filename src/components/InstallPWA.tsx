/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

function isInStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true
  );
}

const DISMISS_KEY = "mindfuel_pwa_dismiss";
const DISMISS_DAYS = 7;

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

    // iOS detection
    if (isIOS()) {
      setTimeout(() => setShowIOSPrompt(true), 3000);
      return;
    }

    // Android/Chrome install prompt
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShowInstallPrompt(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
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
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-24 left-4 right-4 md:left-auto md:right-8 md:bottom-8 z-50 md:w-96 bg-white dark:bg-[#111827] border border-border shadow-2xl rounded-3xl overflow-hidden isolate"
          role="dialog"
          aria-label="Install MindFuel app"
        >
          {/* Green accent top bar */}
          <div className="h-1 w-full bg-gradient-to-r from-brand-green/60 via-brand-green to-brand-green/60" />

          <div className="p-5 flex flex-col md:flex-row gap-4 items-center md:items-start relative">
            {/* Subtle bg glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand-green/5 to-transparent pointer-events-none -z-10" />

            {/* App icon */}
            <div className="h-16 w-16 md:h-14 md:w-14 bg-gradient-to-br from-gray-900 to-black rounded-2xl flex-shrink-0 flex items-center justify-center shadow-lg overflow-hidden border border-white/10 mx-auto md:mx-0">
              <Image src="/logo.png" alt="MindFuel" width={40} height={40} className="w-10 h-10 object-contain" />
            </div>

            <div className="flex-1 text-center md:text-left w-full">
              <h3 className="font-bold text-[18px] md:text-[16px] leading-tight mb-1 tracking-tight">
                Get MindFuel App
              </h3>
              <p className="text-[14px] md:text-[13px] text-muted-foreground leading-snug mb-4">
                {showIOSPrompt
                  ? "Install MindFuel on your iPhone for the best experience."
                  : "Add to your home screen for quick access and a native-like experience."}
              </p>

              {showIOSPrompt ? (
                <div className="flex items-center justify-center md:justify-start gap-2 text-[13px] text-muted-foreground bg-secondary/40 rounded-xl px-4 py-3">
                  <span>Tap</span>
                  <Share className="w-4 h-4 text-blue-500" />
                  <span>then &quot;Add to Home Screen&quot;</span>
                </div>
              ) : (
                <button
                  onClick={handleInstallClick}
                  className="w-full bg-[#00a855] hover:bg-[#00a855]/90 text-white font-bold py-3.5 md:py-2.5 rounded-xl text-[14px] md:text-[13px] transition-colors press-scale flex items-center justify-center gap-2 shadow-brand-sm"
                >
                  <Download className="w-[18px] h-[18px] md:w-4 md:h-4" /> Install App
                </button>
              )}
            </div>

            {/* Close button */}
            <button
              onClick={handleDismiss}
              aria-label="Dismiss install prompt"
              className="absolute top-3 right-3 p-1.5 md:p-1 text-muted-foreground hover:bg-secondary/80 rounded-full transition-colors focus:outline-none"
            >
              <X className="w-5 h-5 md:w-4 md:h-4" aria-hidden="true" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
