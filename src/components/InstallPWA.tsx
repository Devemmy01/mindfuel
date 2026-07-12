/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";

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
const DISMISS_DAYS = 30;
const VISIT_KEY = "mindfuel_app_visits";
const SHOWN_SESSION_KEY = "mindfuel_pwa_shown_session";

export default function InstallPWA() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [showManualPrompt, setShowManualPrompt] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isAppRoute = pathname !== "/" && !pathname.startsWith("/guides") && !pathname.startsWith("/privacy") && !pathname.startsWith("/terms") && !pathname.startsWith("/cookies");
  const eligible = Boolean(user && !loading && isAppRoute);
  const automaticPromptEligible = Boolean(user && !loading && isAppRoute);

  // Public/marketing pages intentionally expose no manifest. Installation is
  // available only from the signed-in app; the manifest launches at /feed.
  useEffect(() => {
    if (!eligible) return;
    const manifest = document.createElement("link");
    manifest.rel = "manifest";
    manifest.href = "/manifest.json";
    manifest.dataset.mindfuelPwa = "true";
    document.head.appendChild(manifest);
    const capable = document.createElement("meta");
    capable.name = "apple-mobile-web-app-capable";
    capable.content = "yes";
    capable.dataset.mindfuelPwa = "true";
    document.head.appendChild(capable);
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "development") {
        // A production worker cached on localhost can serve stale chunks and
        // break hydration during Fast Refresh.
        navigator.serviceWorker.getRegistrations().then((registrations) => registrations.forEach((registration) => registration.unregister()));
      } else {
        navigator.serviceWorker.getRegistration("/").then((registration) => {
          if (!registration) navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
        });
      }
    }
    return () => document.querySelectorAll('[data-mindfuel-pwa="true"]').forEach((node) => node.remove());
  }, [eligible]);

  useEffect(() => {
    if (!eligible) {
      setShowInstallPrompt(false);
      setShowIOSPrompt(false);
      setShowManualPrompt(false);
    }
  }, [eligible]);

  useEffect(() => {
    if (!eligible) return;
    setMounted(true);
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [eligible]);

  useEffect(() => {
    const requestInstall = async () => {
      if (!eligible) return;
      if (isInStandaloneMode()) return;
      if (isIOS()) {
        setShowIOSPrompt(true);
        return;
      }
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") localStorage.setItem(DISMISS_KEY, String(Date.now()));
        setDeferredPrompt(null);
        return;
      }
      setShowManualPrompt(true);
    };
    window.addEventListener("mindfuel:request-install", requestInstall);
    return () => window.removeEventListener("mindfuel:request-install", requestInstall);
  }, [deferredPrompt, eligible]);

  useEffect(() => {
    if (!automaticPromptEligible || isInStandaloneMode() || sessionStorage.getItem(SHOWN_SESSION_KEY)) return;
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && (Date.now() - dismissedAt) / 86_400_000 < DISMISS_DAYS) return;
    const visits = Number(localStorage.getItem(VISIT_KEY) || 0) + 1;
    localStorage.setItem(VISIT_KEY, String(visits));
    // Ask engaged members, never immediately after sign-in or on every visit.
    if (visits < 3) return;
    const timer = setTimeout(() => {
      sessionStorage.setItem(SHOWN_SESSION_KEY, "true");
      if (isIOS()) setShowIOSPrompt(true);
      else if (deferredPrompt) setShowInstallPrompt(true);
    }, 45_000);
    return () => clearTimeout(timer);
  }, [automaticPromptEligible, deferredPrompt]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowInstallPrompt(false);
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    setShowIOSPrompt(false);
    setShowManualPrompt(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  if (!mounted || !eligible) return null;

  const showPrompt = showInstallPrompt || showIOSPrompt || showManualPrompt;

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-20 left-4 right-4 md:left-auto md:right-8 md:bottom-8 z-[9999] md:w-[400px]"
        >
          <div className="modal-solid border border-border/60 rounded-[28px] overflow-hidden p-1.5">
            <div className="p-4 flex gap-4 items-center relative">
              {/* App icon */}
              <div className="w-12 h-12 rounded-2xl bg-brand-green/10 flex items-center justify-center shrink-0 overflow-hidden border border-brand-green/20">
                <Image src="/icon-192.png" alt="MindFuel" width={48} height={48} className="w-full h-full object-cover" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-[16px] leading-tight mb-0.5">Keep MindFuel close</h3>
                <p className="text-[13px] text-muted-foreground leading-snug">
                  {showIOSPrompt
                    ? "Add to home screen for the full experience."
                    : showManualPrompt
                    ? "You can install MindFuel whenever you are ready."
                    : "Open your reflections faster, with a focused app experience."}
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
              ) : showManualPrompt ? (
                <div className="rounded-2xl border border-border/40 bg-secondary/30 p-3.5 text-[13px] leading-relaxed text-muted-foreground">
                  Open your browser menu and choose <strong className="text-foreground">Install MindFuel</strong> or <strong className="text-foreground">Add to Home Screen</strong>. You can return to the install button later.
                </div>
              ) : (
                <button
                  onClick={handleInstallClick}
                  className="w-full bg-brand-green hover:bg-brand-green/90 text-white font-bold h-12 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download MindFuel App
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
