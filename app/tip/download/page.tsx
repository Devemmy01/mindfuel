"use client";

import React, { useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { toPng } from "html-to-image";
import { Download, ArrowLeft, RefreshCw, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

function DownloadContent() {
  const searchParams = useSearchParams();
  const text = searchParams.get("text") || "Breathe deeply. You are exactly where you need to be.";
  
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [hasDownloaded, setHasDownloaded] = useState(false);

  const handleDownload = React.useCallback(async () => {
    if (!cardRef.current || isDownloading) return;
    setIsDownloading(true);
    try {
      // Wait for everything to be ready
      await new Promise((r) => setTimeout(r, 800));
      
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        quality: 1,
        pixelRatio: 3,
        backgroundColor: "#0a0a0a",
        fontEmbedCSS: "", // Disable automatic font embedding to bypass SecurityError
        filter: (node) => {
          // Skip any style tags that might cause issues
          if (node.tagName === 'STYLE' || node.tagName === 'LINK') {
            try {
              const styleNode = node as HTMLStyleElement | HTMLLinkElement;
              if (styleNode.sheet) {
                // Just check if we can access it
                void styleNode.sheet.cssRules;
              }
            } catch {
              return false;
            }
          }
          return true;
        }
      });
      
      const link = document.createElement("a");
      link.download = `mindfuel-daily-tip.png`;
      link.href = dataUrl;
      link.click();
      setHasDownloaded(true);
    } catch (err) {
      console.error("Failed to download tip:", err);
    } finally {
      setIsDownloading(false);
    }
  }, [isDownloading]);

  // Remove auto-download on load per user request.

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 sm:p-12">
      {/* Premium subtle background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] bg-brand-green/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-1/4 w-[600px] h-[600px] bg-brand-green/5 rounded-full blur-[100px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg relative z-10"
      >
        {/* Branding Header (Not part of download) */}
        <div className="flex items-center justify-between mb-8 px-2">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-5 h-5 text-white/70 group-hover:text-white" />
            </div>
            <span className="text-[13px] font-bold text-white/50">Back to Feed</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-brand-green" />
            <span className="text-[11px] font-black uppercase tracking-widest text-brand-green">Download Ready</span>
          </div>
        </div>

        {/* The Card - This is what gets captured */}
        <div className="relative group perspective-1000 shadow-2xl rounded-[3rem]">
          <div 
            ref={cardRef}
            className="w-full aspect-[4/5] sm:aspect-square bg-[#0a0a0a] border border-white/10 rounded-[3rem] p-10 sm:p-14 flex flex-col relative overflow-hidden"
            style={{
              backgroundImage: 'radial-gradient(circle at 0% 0%, rgba(0, 191, 99, 0.15) 0%, transparent 50%), radial-gradient(circle at 100% 100%, rgba(0, 191, 99, 0.05) 0%, transparent 50%)'
            }}
          >
            {/* MindFuel Logo inside the card as requested */}
            <div className="flex justify-center mb-12 sm:mb-16">
              <div className="bg-white/5 px-6 py-3 rounded-2xl border border-white/5">
                <Image 
                  src="/logoDarkbg.png" 
                  alt="MindFuel" 
                  width={140} 
                  height={40} 
                  className="opacity-90"
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col justify-center">
              <div className="relative">
                <span className="absolute -top-10 -left-6 text-[100px] font-serif leading-none opacity-10 text-brand-green select-none pointer-events-none">
                  &ldquo;
                </span>
                <p className="text-[26px] sm:text-[34px] font-bold leading-[1.3] tracking-tight text-white mb-10 relative z-10 italic drop-shadow-lg">
                  {text}
                </p>
                
              </div>
            </div>

            {/* Premium Watermark */}
            <div className="mt-auto pt-10 flex items-center justify-between border-t border-white/5">
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="text-[16px] font-black text-white/40">Daily Mindful Tip</span>
                  <span className="text-[12px] font-medium text-white/20">mind-fuel.app</span>
                </div>
              </div>
              <div className="text-[12px] font-black text-white/20">
                Reflection
              </div>
            </div>
          </div>
        </div>

        {/* Status & Actions */}
        <div className="mt-12 flex flex-col items-center gap-6">
          <AnimatePresence mode="wait">
            {!hasDownloaded ? (
              <motion.button
                key="downloading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleDownload}
                className="w-full h-16 bg-white text-black rounded-3xl font-black uppercase tracking-widest text-[14px] flex items-center justify-center gap-3 shadow-2xl hover:scale-[1.02] transition-all active:scale-[0.98]"
              >
                {isDownloading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Preparing Card...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Download Image
                  </>
                )}
              </motion.button>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full bg-brand-green/10 border border-brand-green/20 p-6 rounded-[2rem] text-center flex flex-col items-center gap-3"
              >
                <div className="w-12 h-12 rounded-full bg-brand-green text-white flex items-center justify-center shadow-lg shadow-brand-green/20 mb-1">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-[17px] font-bold text-white">Saved Successfully</h3>
                <p className="text-white/60 text-[13px] max-w-[280px]">
                  Your mindful card is ready. Share your journey and inspire others.
                </p>
                <Link 
                  href="/"
                  className="mt-2 text-brand-green font-bold text-[13px] hover:underline underline-offset-4"
                >
                  Return to MindFuel
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
          
          <p className="text-white/30 text-[11px] font-medium uppercase tracking-[0.15em] text-center max-w-[240px] leading-relaxed">
            Curated daily by MindFuel. Your space for intentional thought.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function TipDownloadPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-brand-green animate-spin" />
      </div>
    }>
      <DownloadContent />
    </Suspense>
  );
}
