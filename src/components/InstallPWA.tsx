/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Wait for a few seconds before showing to not be too aggressive
      setTimeout(() => setShowInstallPrompt(true), 2500);
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

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {showInstallPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          className="fixed bottom-24 left-4 right-4 md:left-auto md:right-8 md:bottom-8 z-50 md:w-96 bg-card border border-border shadow-2xl rounded-3xl p-5 flex flex-col md:flex-row gap-4 items-center md:items-start isolate overflow-hidden"
        >
          <div className="absolute inset-0 bg-brand-green/5 pointer-events-none -z-10" />

          <div className="h-16 w-16 md:h-12 md:w-12 bg-black rounded-2xl flex-shrink-0 flex items-center justify-center shadow-inner overflow-hidden border border-white/10 mx-auto md:mx-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logoWhitebg.png" alt="MindFuel" className="w-full h-full object-cover" />
          </div>

          <div className="flex-1 text-center md:text-left w-full mt-2 md:mt-0 pt-0.5">
            <h3 className="font-bold text-[18px] md:text-[16px] leading-tight mb-1.5 tracking-tight">Install MindFuel</h3>
            <p className="text-[14px] md:text-[13px] text-muted-foreground leading-snug md:pr-4 mb-5 md:mb-4">
              Add to your home screen for quick access, offline support, and a better experience.
            </p>

            <button
              onClick={handleInstallClick}
              className="w-full bg-[#00a855] hover:bg-[#00a855]/90 text-white font-bold py-3.5 md:py-2.5 rounded-xl text-[14px] md:text-[13px] transition-colors press-scale flex items-center justify-center gap-2 shadow-brand-sm"
            >
              <Download className="w-[18px] h-[18px] md:w-4 md:h-4" /> Install App
            </button>
          </div>

          <button
            onClick={() => setShowInstallPrompt(false)}
            className="absolute top-3 right-3 p-1.5 md:p-1 text-muted-foreground hover:bg-secondary/80 rounded-full transition-colors focus:outline-none bg-background/50 backdrop-blur-sm"
          >
            <X className="w-5 h-5 md:w-4 md:h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
