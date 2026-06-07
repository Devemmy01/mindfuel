"use client";

import React, { useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { toPng } from "html-to-image";
import { Download, ArrowLeft, RefreshCw, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { logoDarkBase64 } from "@/lib/logoBase64";
import { motion, AnimatePresence } from "framer-motion";

// Fixed output dimensions in pixels — always 1080×1350 regardless of device
const CARD_W = 1080;
const CARD_H = 1350;

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
      // Give the browser a moment to finish rendering
      await new Promise((r) => setTimeout(r, 800));

      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        quality: 1,
        // Fix capture at CARD_W × CARD_H so mobile and desktop produce
        // identical images regardless of the on-screen preview scale.
        width: CARD_W,
        height: CARD_H,
        pixelRatio: 1,
        backgroundColor: "#0a0a0a",
        fontEmbedCSS: "", // Avoid SecurityError from cross-origin stylesheets
        filter: (node) => {
          if (node.tagName === "STYLE" || node.tagName === "LINK") {
            try {
              const s = node as HTMLStyleElement | HTMLLinkElement;
              if (s.sheet) void s.sheet.cssRules;
            } catch {
              return false;
            }
          }
          return true;
        },
      });

      const link = document.createElement("a");
      link.download = "mindfuel-daily-tip.png";
      link.href = dataUrl;
      link.click();
      setHasDownloaded(true);
    } catch (err) {
      console.error("Failed to download tip:", err);
    } finally {
      setIsDownloading(false);
    }
  }, [isDownloading]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 sm:p-12">
      {/* Background glows (not captured) */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] bg-brand-green/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-1/4 w-[600px] h-[600px] bg-brand-green/5 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg relative z-10"
      >
        {/* Page header — not part of the downloaded image */}
        <div className="flex items-center justify-between mb-8 px-2">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-5 h-5 text-white/70 group-hover:text-white" />
            </div>
            <span className="text-[13px] font-bold text-white/50">Back to Feed</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-brand-green" />
            <span className="text-[11px] font-black uppercase tracking-widest text-brand-green">
              Download Ready
            </span>
          </div>
        </div>

        {/*
          Preview wrapper:
          The inner card is rendered at its true pixel size (CARD_W × CARD_H) via
          inline styles, then scaled down to fit the screen using CSS transform.
          transformOrigin="top left" + explicit wrapper height keep the layout intact.

          On desktop  (~512 px container): scale ≈ 512/1080 ≈ 0.474
          On mobile   (~320 px container): scale ≈ 320/1080 ≈ 0.296

          The toPng call captures the node BEFORE the transform is applied, so it
          always produces a full-size 1080×1350 image.
        */}
        <div
          className="relative shadow-2xl overflow-hidden"
          style={{
            // Reserve the height the scaled card will visually occupy.
            // height = CARD_H × scale. We use a CSS custom property set by the
            // <style> block below so each breakpoint is handled automatically.
            height: `calc(${CARD_H}px * var(--preview-scale, 0.474))`,
            width: "100%",
          }}
        >
          {/* Preview scale container — holds the transform. This does NOT get captured. */}
          <div
            style={{
              width: `${CARD_W}px`,
              height: `${CARD_H}px`,
              transform: "scale(var(--preview-scale, 0.474))",
              transformOrigin: "top left",
              flexShrink: 0,
            }}
          >
            {/* ── Captured card — untransformed 1080x1350 px layout ── */}
            <div
              ref={cardRef}
              style={{
                width: `${CARD_W}px`,
                height: `${CARD_H}px`,
                backgroundColor: "#0a0a0a",
                backgroundImage:
                  "radial-gradient(circle at 0% 0%, rgba(0,191,99,0.15) 0%, transparent 50%), " +
                  "radial-gradient(circle at 100% 100%, rgba(0,191,99,0.05) 0%, transparent 50%)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "0px", // No rounded corners as requested
                overflow: "hidden",
                padding: "108px",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
              }}
            >
            {/* Logo */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: "110px",
              }}
            >
              <div
                style={{
                  background: "rgba(255,255,255,0.05)",
                  padding: "18px 48px",
                  borderRadius: "20px",
                  border: "1px solid rgba(255,255,255,0.05)",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoDarkBase64}
                  alt="MindFuel"
                  width="240"
                  height="68"
                  style={{ opacity: 0.9, display: "block" }}
                />
              </div>
            </div>

            {/* Quote */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ position: "relative" }}>
                {/* Opening quote mark */}
                <span
                  style={{
                    position: "absolute",
                    top: "-72px",
                    left: "-20px",
                    fontSize: "180px",
                    lineHeight: 1,
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    opacity: 0.1,
                    color: "#00bf63",
                    userSelect: "none",
                    pointerEvents: "none",
                  }}
                >
                  &ldquo;
                </span>
                <p
                  style={{
                    fontSize: "68px",
                    fontWeight: 700,
                    lineHeight: 1.3,
                    letterSpacing: "-0.02em",
                    color: "#ffffff",
                    marginBottom: "60px",
                    position: "relative",
                    zIndex: 10,
                    fontStyle: "italic",
                    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
                  }}
                >
                  {text}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                marginTop: "auto",
                paddingTop: "52px",
                borderTop: "1px solid rgba(255,255,255,0.05)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span
                  style={{
                    fontSize: "30px",
                    fontWeight: 900,
                    color: "rgba(255,255,255,0.4)",
                    fontFamily: "Inter, system-ui, sans-serif",
                  }}
                >
                  Daily Mindful Tip
                </span>
                <span
                  style={{
                    fontSize: "22px",
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.2)",
                    fontFamily: "Inter, system-ui, sans-serif",
                  }}
                >
                  mind-fuel.app
                </span>
              </div>
              <span
                style={{
                  fontSize: "22px",
                  fontWeight: 900,
                  color: "rgba(255,255,255,0.2)",
                  fontFamily: "Inter, system-ui, sans-serif",
                }}
              >
                Reflection
              </span>
            </div>
          </div>
        </div>
      </div>

        {/* Actions */}
        <div className="mt-12 flex flex-col items-center gap-6">
          <AnimatePresence mode="wait">
            {!hasDownloaded ? (
              <motion.button
                key="download"
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

      {/*
        CSS custom property that controls the preview scale.
        Desktop (≥ 512 px container / max-w-lg): 512 / 1080 ≈ 0.474
        Small mobile (≤ 390 px):                 340 / 1080 ≈ 0.315
      */}
      <style>{`
        :root { --preview-scale: 0.474; }
        @media (max-width: 480px)  { :root { --preview-scale: 0.32; } }
        @media (max-width: 360px)  { :root { --preview-scale: 0.29; } }
      `}</style>
    </div>
  );
}

export default function TipDownloadPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-brand-green animate-spin" />
        </div>
      }
    >
      <DownloadContent />
    </Suspense>
  );
}
