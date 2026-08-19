"use client";

import React, { Suspense, useCallback, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toBlob } from "html-to-image";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Download,
  ImageIcon,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { logoDarkBase64 } from "@/lib/logoBase64";

// The downloaded card always uses this social-friendly 4:5 resolution.
const CARD_W = 1080;
const CARD_H = 1350;

function getExportQuoteSize(text: string) {
  if (text.length > 230) return 43;
  if (text.length > 170) return 50;
  if (text.length > 110) return 58;
  return 68;
}

function TipPreview({ text }: { text: string }) {
  const quoteSize =
    text.length > 230
      ? "clamp(1.05rem, 4.7cqw, 1.75rem)"
      : text.length > 150
        ? "clamp(1.15rem, 5.3cqw, 2rem)"
        : "clamp(1.3rem, 6cqw, 2.35rem)";

  return (
    <div className="tip-preview relative aspect-[4/5] w-full overflow-hidden border border-white/10 bg-[#07100b] [container-type:inline-size]">
      <div className="pointer-events-none absolute -left-1/3 -top-1/4 h-2/3 w-2/3 rounded-full bg-brand-green/20 blur-[70px]" />
      <div className="pointer-events-none absolute -bottom-1/4 -right-1/3 h-2/3 w-2/3 rounded-full bg-brand-green/10 blur-[80px]" />

      <div className="relative flex h-full flex-col p-[9%]">
        <div className="flex justify-center">
          <div className="inline-flex items-center rounded-xl border border-line-subtle bg-white/[0.055] px-[5%] py-[2.2%]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoDarkBase64}
              alt="MindFuel"
              className="h-auto w-[clamp(5.5rem,24cqw,8rem)] opacity-90"
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 items-center py-[8%]">
          <div className="relative w-full">
            <span
              aria-hidden="true"
              className="absolute -left-[1%] -top-[0.65em] select-none font-serif text-[clamp(4rem,20cqw,8rem)] leading-none text-brand-green/15"
            >
              &ldquo;
            </span>
            <p
              className="relative z-10 font-bold italic leading-[1.28] tracking-[-0.025em] text-white"
              style={{ fontSize: quoteSize }}
            >
              {text}
            </p>
          </div>
        </div>

        <div className="flex items-end justify-between gap-4 border-t border-line-subtle pt-[6%]">
          <div>
            <p className="text-[clamp(0.62rem,2.8cqw,0.82rem)] font-black text-white/55">
              Daily Mindful Tip
            </p>
            <p className="mt-1 text-[clamp(0.5rem,2.2cqw,0.7rem)] font-medium text-white/25">
              mind-fuel.app
            </p>
          </div>
          <p className="text-[clamp(0.5rem,2.2cqw,0.7rem)] font-black uppercase tracking-[0.16em] text-white/25">
            Reflection
          </p>
        </div>
      </div>
    </div>
  );
}

function ExportCard({
  text,
  cardRef,
}: {
  text: string;
  cardRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={cardRef}
      style={{
        width: CARD_W,
        height: CARD_H,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        padding: 108,
        color: "#ffffff",
        backgroundColor: "#07100b",
        backgroundImage:
          "radial-gradient(circle at 0% 0%, rgba(0,191,99,0.18) 0%, transparent 50%), radial-gradient(circle at 100% 100%, rgba(0,191,99,0.07) 0%, transparent 50%)",
        border: "1px solid rgba(255,255,255,0.1)",
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "18px 48px",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 20,
            background: "rgba(255,255,255,0.055)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoDarkBase64}
            alt="MindFuel"
            width="240"
            height="68"
            style={{ display: "block", opacity: 0.9 }}
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          minHeight: 0,
          flex: 1,
          alignItems: "center",
          padding: "80px 0",
        }}
      >
        <div style={{ position: "relative", width: "100%" }}>
          <span
            style={{
              position: "absolute",
              top: -72,
              left: -20,
              color: "#00bf63",
              fontFamily: "Georgia, serif",
              fontSize: 180,
              lineHeight: 1,
              opacity: 0.13,
              userSelect: "none",
            }}
          >
            &ldquo;
          </span>
          <p
            style={{
              position: "relative",
              zIndex: 1,
              margin: 0,
              color: "#ffffff",
              fontFamily: "Inter, Arial, sans-serif",
              fontSize: getExportQuoteSize(text),
              fontStyle: "italic",
              fontWeight: 700,
              letterSpacing: "-0.025em",
              lineHeight: 1.28,
            }}
          >
            {text}
          </p>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          paddingTop: 52,
          borderTop: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              color: "rgba(255,255,255,0.52)",
              fontSize: 30,
              fontWeight: 900,
            }}
          >
            Daily Mindful Tip
          </p>
          <p
            style={{
              margin: "8px 0 0",
              color: "rgba(255,255,255,0.24)",
              fontSize: 22,
              fontWeight: 500,
            }}
          >
            mind-fuel.app
          </p>
        </div>
        <p
          style={{
            margin: 0,
            color: "rgba(255,255,255,0.24)",
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          Reflection
        </p>
      </div>
    </div>
  );
}

function DownloadContent() {
  const searchParams = useSearchParams();
  const text =
    searchParams.get("text") ||
    "Breathe deeply. You are exactly where you need to be.";

  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [hasDownloaded, setHasDownloaded] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!cardRef.current || isDownloading) return;

    setIsDownloading(true);
    try {
      const blob = await toBlob(cardRef.current, {
        cacheBust: true,
        quality: 1,
        width: CARD_W,
        height: CARD_H,
        pixelRatio: 1,
        backgroundColor: "#07100b",
        fontEmbedCSS: "",
        filter: (node) => {
          if (node.tagName === "STYLE" || node.tagName === "LINK") {
            try {
              const styleNode = node as HTMLStyleElement | HTMLLinkElement;
              if (styleNode.sheet) void styleNode.sheet.cssRules;
            } catch {
              return false;
            }
          }
          return true;
        },
      });

      if (!blob) throw new Error("Failed to render tip image");

      const fileName = "mindfuel-daily-tip.png";
      const file = new File([blob], fileName, { type: "image/png" });

      // iOS Safari ignores the `download` attribute on anchors (it just
      // navigates to the image instead of saving it), so on devices that
      // support the Web Share API we hand the file to the native share
      // sheet, which offers "Save Image" and always works.
      if (
        typeof navigator !== "undefined" &&
        navigator.canShare?.({ files: [file] })
      ) {
        try {
          await navigator.share({ files: [file], title: fileName });
          setHasDownloaded(true);
        } catch (shareError) {
          if ((shareError as Error)?.name !== "AbortError") throw shareError;
        }
        return;
      }

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = fileName;
      link.href = objectUrl;
      // Safari (desktop and iOS) can silently no-op a click() on an anchor
      // that isn't attached to the document, so it must be appended first.
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      setHasDownloaded(true);
    } catch (error) {
      console.error("Failed to download tip:", error);
    } finally {
      setIsDownloading(false);
    }
  }, [isDownloading]);

  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-[#050806] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-52 -top-52 h-[34rem] w-[34rem] rounded-full bg-brand-green/[0.09] blur-[120px]" />
        <div className="absolute -bottom-64 -right-48 h-[38rem] w-[38rem] rounded-full bg-emerald-900/10 blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:48px_48px]" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-7 lg:px-8 lg:py-10">
        <header className="mb-5 flex items-center justify-between gap-4 sm:mb-8">
          <Link
            href="/feed"
            className="group inline-flex min-h-11 items-center gap-2.5 text-sm font-bold text-white/65 hover:text-white"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] transition-transform group-hover:-translate-x-0.5">
              <ArrowLeft className="h-4 w-4" />
            </span>
            Back to feed
          </Link>

          <div className="inline-flex items-center gap-2 rounded-full border border-brand-green/15 bg-brand-green/[0.07] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300 sm:text-[11px]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-green opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-green" />
            </span>
            Ready to save
          </div>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] lg:gap-10 mt-7"
        >
          <section
            aria-labelledby="preview-heading"
            className="rounded-[1.75rem] border border-line-subtle bg-white/[0.025] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.25)] sm:rounded-[2rem] sm:p-5 mt-5"
          >
            <div className="mb-3 flex items-center justify-between px-1 sm:mb-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-green">
                  Card preview
                </p>
                <h2
                  id="preview-heading"
                  className="mt-1 text-sm font-bold text-white/80"
                >
                  Your shareable reflection
                </h2>
              </div>
            </div>

            <div className="mx-auto w-full max-w-[540px] overflow-hidden rounded-[1.2rem] bg-black/30 p-1.5 sm:rounded-[1.5rem] sm:p-2">
              <TipPreview text={text} />
            </div>
          </section>

          <aside className="lg:sticky lg:top-10">
            <div className="rounded-[1.75rem] border border-line-subtle bg-surface-raised/90 p-5 shadow-[0_30px_100px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:rounded-[2rem] sm:p-7">
              <div className="hidden h-12 w-12 items-center justify-center rounded-2xl border border-brand-green/15 bg-brand-green/10 text-brand-green sm:flex">
                <ImageIcon className="h-5 w-5" />
              </div>
              <h1 className="text-xl font-black tracking-[-0.035em] sm:mt-5 sm:text-3xl">
                Take this thought with you.
              </h1>
              <p className="mt-3 hidden text-sm leading-6 text-white/50 sm:block">
                Save a polished, high-resolution card that is ready to share or
                keep as a personal reminder.
              </p>

              <div className="my-6 hidden h-px bg-white/[0.07] sm:block" />

              <ul className="hidden space-y-3 text-[13px] font-semibold text-white/60 sm:block">
                <li className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  High-resolution PNG
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  Optimized 4:5 format
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </span>
                  Generated privately in your browser
                </li>
              </ul>

              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="mt-5 flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 text-[13px] font-black tracking-[0.13em] text-black shadow-[0_16px_40px_rgba(255,255,255,0.08)] transition-all hover:-translate-y-0.5 hover:bg-emerald-50 active:translate-y-0 disabled:cursor-wait disabled:opacity-70 sm:mt-7"
              >
                {isDownloading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Preparing image…
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    {hasDownloaded ? "Download again" : "Download image"}
                  </>
                )}
              </button>

              <div aria-live="polite" className="min-h-12">
                {hasDownloaded && !isDownloading && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-brand-green/15 bg-brand-green/[0.07] px-3 py-3 text-center text-xs font-bold text-emerald-300"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Saved successfully
                  </motion.div>
                )}
              </div>
            </div>
          </aside>
        </motion.div>
      </div>

      {/* Kept off-screen at full resolution so the exported PNG never depends
          on the viewport or the responsive preview dimensions. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-[-10000px] top-0"
      >
        <ExportCard text={text} cardRef={cardRef} />
      </div>
    </main>
  );
}

export default function TipDownloadPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100svh] items-center justify-center bg-[#050806]">
          <RefreshCw className="h-7 w-7 animate-spin text-brand-green" />
        </div>
      }
    >
      <DownloadContent />
    </Suspense>
  );
}
