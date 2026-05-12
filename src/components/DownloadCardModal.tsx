"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Loader2, Plus } from "lucide-react";
import { backgroundOptions } from "@/lib/backgrounds";
import { useToast } from "@/providers/ToastProvider";
import { PostType } from "@/types";

const isColorLight = (hex: string) => {
  if (!hex || !hex.startsWith("#")) return true;
  const c = hex.substring(1);
  const rgb = parseInt(c, 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luma > 160;
};

interface DownloadCardModalProps {
  post: PostType;
  isOpen: boolean;
  onClose: () => void;
}

export default function DownloadCardModal({
  post,
  isOpen,
  onClose,
}: DownloadCardModalProps) {
  const { showToast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Pick initial background from post's saved style (or first option)
  const getInitialBg = () => {
    const found = backgroundOptions.find(
      (o) => o.value === post.backgroundStyle?.value,
    );
    return found ?? backgroundOptions[0];
  };

  const [selectedBg, setSelectedBg] = useState(getInitialBg);

  // Re-sync when modal opens
  useEffect(() => {
    if (isOpen) setSelectedBg(getInitialBg());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, post._id]);

  const handleDownload = async () => {
    if (!cardRef.current || isDownloading) return;
    setIsDownloading(true);
    try {
      const { toPng } = await import("html-to-image");
      await new Promise((r) => setTimeout(r, 350));
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        quality: 1,
        pixelRatio: 3,
        skipFonts: true,
      });
      const link = document.createElement("a");
      link.download = `mindfuel-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      showToast("Card downloaded!", "success");
      onClose();
    } catch (err) {
      console.error("Download failed", err);
      showToast("Download failed, please try again", "warning");
    } finally {
      setIsDownloading(false);
    }
  };

  // Strip prompt prefix for cleaner card display
  const getCardText = () => {
    const match = post.text.match(/^Reflecting on: "[^"]+"\s*([\s\S]*)$/);
    return match ? match[1].trimStart() : post.text;
  };

  const cardText = getCardText();
  const textColor = selectedBg.text;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="download-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="relative max-w-lg bg-[#0a0a0a] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-auto animate-in fade-in zoom-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-8 py-6 flex items-center justify-between border-bottom border-white/5">
              <div className="space-y-1">
                <h3 className="text-xl font-black text-white tracking-tight">
                  Download as Card
                </h3>
                <p className="text-xs text-white/40 font-medium">
                  Choose a style, then save your thought
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-full transition-colors group"
              >
                <X className="w-5 h-5 text-white/40 group-hover:text-white" />
              </button>
            </div>

            <div className="p-5 space-y-6 max-h-[85vh] overflow-y-auto scrollbar-dark">
              {/* Premium Card Preview */}
              <div className="relative group/preview flex justify-center">
                <div
                  ref={cardRef}
                  className="relative w-full max-w-[400px] min-h-[500px] h-auto overflow-hidden shadow-2xl transition-all duration-500 flex flex-col"
                  style={{
                    background: selectedBg.value,
                    color: textColor,
                  }}
                >
                  {/* Subtle Grain Overlay */}
                  <div className="absolute inset-0 opacity-[0.15] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />

                  {/* Top Left Quote Icon */}
                  <div className="px-6 pt-12 pb-0 z-20">
                    <span className="text-[100px] font-extrabold font-serif leading-none opacity-20 select-none">
                      &ldquo;
                    </span>
                  </div>

                  {/* 2. Content Row (Hero Text) */}
                  <div className="flex-1 px-6 flex flex-col justify-start -mt-4 relative z-20 overflow-hidden">
                    <p
                      className="font-bold leading-[1.4] tracking-tight whitespace-pre-wrap break-words"
                      style={{
                        color: textColor,
                        fontFamily: "'Inter', sans-serif",
                        fontSize:
                          cardText.length > 200
                            ? "18px"
                            : cardText.length > 100
                              ? "22px"
                              : "26px",
                        textShadow:
                          textColor === "#ffffff"
                            ? "0 4px 20px rgba(0,0,0,0.3)"
                            : "none",
                      }}
                    >
                      {cardText}
                    </p>
                  </div>

                  {/* 3. Bottom Right Pill */}
                  <div className="px-6 pb-5 flex justify-end z-20">
                    <div className="bg-black/20 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-full">
                      <span className="text-[12px] font-black tracking-widest lowercase text-white">
                        mind-fuel.app
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Background Style Picker */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Choose Style
                  </span>
                  <span className="text-[11px] font-medium text-brand-green bg-brand-green/10 px-2 py-0.5 rounded-full">
                    Premium Selection
                  </span>
                </div>

                <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-full border border-border/50 overflow-x-auto no-scrollbar">
                  {/* Custom color picker */}
                  <div className="relative flex-shrink-0 w-10 h-10 rounded-full overflow-hidden border-2 border-border/50 hover:border-brand-green transition-all group">
                    <input
                      type="color"
                      value={
                        selectedBg.id === "custom"
                          ? selectedBg.value
                          : "#00bf63"
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedBg({
                          id: "custom",
                          name: "Custom",
                          type: "color",
                          value: val,
                          text: isColorLight(val) ? "#171717" : "#ffffff",
                        });
                      }}
                      className="absolute inset-[-10px] w-20 h-20 cursor-pointer opacity-0 z-10"
                    />
                    {selectedBg.id === "custom" ? (
                      <div
                        className="w-full h-full"
                        style={{ backgroundColor: selectedBg.value }}
                      />
                    ) : (
                      <div className="w-full h-full bg-[conic-gradient(red,yellow,lime,aqua,blue,magenta,red)] opacity-90" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                      <Plus className="w-4 h-4 text-white" />
                    </div>
                  </div>

                  <div className="w-px h-8 bg-border/50 flex-shrink-0 mx-1" />

                  {backgroundOptions.slice(0, 12).map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setSelectedBg(opt)}
                      title={opt.name}
                      className={`w-10 h-10 rounded-full transition-all flex-shrink-0 ${
                        selectedBg.id === opt.id && selectedBg.id !== "custom"
                          ? "scale-110 border-brand-green shadow-lg ring-2 ring-brand-green/10"
                          : "border-transparent opacity-80 hover:opacity-100 hover:scale-105"
                      }`}
                      style={{ background: opt.value }}
                    />
                  ))}
                </div>
              </div>

              {/* Download CTA */}
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="w-full py-3 bg-[#00a855] text-white font-bold text-[16px] rounded-full flex justify-center gap-3 disabled:opacity-50 transition-all shadow-brand-xl hover:shadow-brand-2xl press-scale hover:bg-[#00bf63] relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 transition-transform" />
                {isDownloading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
                {isDownloading ? "Downloading…" : "Download Card"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
