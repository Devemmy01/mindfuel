"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, RefreshCw } from "lucide-react";

export default function OfflineNotice() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    setIsOffline(!window.navigator.onLine);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-24 left-4 right-4 md:left-auto md:right-8 md:bottom-8 z-[100] md:w-80 bg-[#111827]/90 backdrop-blur-md border border-rose-500/20 shadow-2xl rounded-3xl overflow-hidden p-5"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center shrink-0">
              <WifiOff className="w-5 h-5 text-rose-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-[16px] text-white leading-tight mb-1">You&apos;re Offline</h3>
              <p className="text-[13px] text-white/60 leading-snug">
                Check your connection. Some features may not work until you&apos;re back online.
              </p>
            </div>
          </div>
          
          <button 
            onClick={() => window.location.reload()}
            className="w-full mt-4 bg-white/5 hover:bg-white/10 text-white font-semibold py-2.5 rounded-xl text-[13px] transition-all flex items-center justify-center gap-2 border border-white/10"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Connection
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
