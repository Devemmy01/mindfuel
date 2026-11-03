"use client";

import React, { useState, useRef, useEffect } from "react";
import { m, AnimatePresence } from "framer-motion";
import { X, Download, Loader2, Plus } from "lucide-react";
import { format } from "date-fns";
import { backgroundOptions, type BackgroundStyle } from "@/lib/backgrounds";
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

type CardLayout = "note" | "quote";

// Solid canvases for the note layout: the white note card sits on top, so
// these stay flat and bold rather than patterned.
const noteCanvasOptions: BackgroundStyle[] = [
  { id: "note-green", name: "MindFuel", type: "color", value: "#00a855", text: "#ffffff" },
  { id: "note-ink", name: "Ink", type: "color", value: "#111827", text: "#ffffff" },
  { id: "note-violet", name: "Violet", type: "color", value: "#7c3aed", text: "#ffffff" },
  { id: "note-ocean", name: "Ocean", type: "color", value: "#0ea5e9", text: "#ffffff" },
  { id: "note-rose", name: "Rose", type: "color", value: "#f43f5e", text: "#ffffff" },
  { id: "note-sun", name: "Sun", type: "color", value: "#facc15", text: "#171717" },
  { id: "note-sand", name: "Sand", type: "color", value: "#efe6d8", text: "#171717" },
  { id: "note-ember", name: "Ember", type: "color", value: "#ff6719", text: "#ffffff" },
];

// A failed avatar fetch (CORS, expired URL) must not abort the whole render.
const TRANSPARENT_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

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

  const [layout, setLayout] = useState<CardLayout>("note");
  const [selectedBg, setSelectedBg] = useState(getInitialBg);
  const [noteCanvas, setNoteCanvas] = useState<BackgroundStyle>(noteCanvasOptions[0]);
  const [avatarFailed, setAvatarFailed] = useState(false);

  // Re-sync when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedBg(getInitialBg());
      setAvatarFailed(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, post._id]);

  const handleDownload = async () => {
    if (!cardRef.current || isDownloading) return;
    setIsDownloading(true);
    try {
      const { toBlob } = await import("html-to-image");
      await new Promise((r) => setTimeout(r, 350));
      const blob = await toBlob(cardRef.current, {
        cacheBust: true,
        quality: 1,
        pixelRatio: 3,
        skipFonts: true,
        imagePlaceholder: TRANSPARENT_PIXEL,
      });
      if (!blob) throw new Error("Failed to render card image");

      const fileName = `mindfuel-${Date.now()}.png`;
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
          showToast("Card downloaded!", "success");
          onClose();
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
  const promptMatch = post.text.match(/^Reflecting on: "([^"]+)"\s*([\s\S]*)$/);
  const cardText = promptMatch ? promptMatch[2].trimStart() : post.text;
  const promptQuestion = promptMatch?.[1] ?? null;
  const textColor = selectedBg.text;

  const author = post.userId;
  const handle = author?.username || author?.name?.replace(/\s+/g, "").toLowerCase() || "";
  const postedOn = post.createdAt ? format(new Date(post.createdAt), "MMM d, yyyy") : "";
  const paragraphs = cardText.split(/\n+/).filter((line) => line.trim());

  // Accent for the avatar ring and prompt chip; light canvases fall back to
  // brand green so the chip stays readable on the white card.
  const noteAccent = isColorLight(noteCanvas.value) ? "#00a855" : noteCanvas.value;

  const activeBg = layout === "note" ? noteCanvas : selectedBg;
  const setActiveBg = layout === "note" ? setNoteCanvas : setSelectedBg;
  const swatches = layout === "note" ? noteCanvasOptions : backgroundOptions.slice(0, 12);

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          key="download-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
          onClick={onClose}
        >
          <m.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="relative max-w-lg bg-surface-raised border border-line rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-auto animate-in fade-in zoom-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-8 py-6 flex items-center justify-between border-bottom border-white/5">
              <div className="space-y-1">
                <h3 className="text-xl font-black text-white tracking-tight">
                  Download as Card
                </h3>
                <p className="text-xs text-white/40 font-medium">
                  Pick a layout and colour, then save it to share anywhere
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
              {/* Layout switch */}
              <div role="tablist" aria-label="Card layout" className="grid grid-cols-2 gap-1 p-1 rounded-full bg-secondary/40 border border-border/50">
                {(["note", "quote"] as const).map((option) => (
                  <button
                    key={option}
                    role="tab"
                    aria-selected={layout === option}
                    onClick={() => setLayout(option)}
                    className={`py-2 rounded-full text-[13px] font-bold capitalize transition-colors ${
                      layout === option
                        ? "bg-surface-raised text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>

              {/* Premium Card Preview */}
              <div className="relative group/preview flex justify-center">
                {layout === "note" ? (
                <div
                  ref={cardRef}
                  // No overflow-hidden: with visible overflow, aspect-square is
                  // only a minimum, so long notes stretch the canvas instead of
                  // being cropped.
                  className="relative w-full max-w-[400px] aspect-square flex flex-col justify-center items-center gap-4 px-6 py-10"
                  style={{ background: noteCanvas.value }}
                >
                  <div
                    className="w-full bg-white rounded-[22px] p-6 text-left"
                    style={{
                      color: "#1f1f1f",
                      fontFamily: "'Inter', sans-serif",
                      boxShadow: "0 24px 48px -16px rgba(0,0,0,0.4)",
                    }}
                  >
                    {/* Author row */}
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-full p-[2px] flex-shrink-0"
                        style={{ background: noteAccent }}
                      >
                        {author?.image && !avatarFailed ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={author.image}
                            alt=""
                            crossOrigin="anonymous"
                            onError={() => setAvatarFailed(true)}
                            className="w-full h-full rounded-full object-cover border-2 border-white"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full border-2 border-white flex items-center justify-center text-white font-bold text-[15px]">
                            {author?.name?.[0]?.toUpperCase() ?? "?"}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 leading-tight">
                        <p className="text-[15px] font-bold truncate" style={{ color: "#111111" }}>
                          {author?.name}
                        </p>
                        {handle ? (
                          <p className="text-[13px] truncate mt-0.5" style={{ color: "#737373" }}>
                            @{handle}
                          </p>
                        ) : null}
                      </div>
                      <span className="text-[11px] font-medium flex-shrink-0" style={{ color: "#9a9a9a" }}>
                        {postedOn}
                      </span>
                    </div>

                    {/* Prompt chip */}
                    {promptQuestion ? (
                      <div
                        className="mt-4 inline-flex max-w-full rounded-xl px-3 py-1.5 text-[12px] font-semibold leading-snug"
                        style={{ background: `${noteAccent}14`, color: noteAccent }}
                      >
                        {promptQuestion}
                      </div>
                    ) : null}

                    {/* Body */}
                    <div
                      className="mt-4 space-y-2.5 break-words font-medium"
                      style={{
                        fontSize: cardText.length > 320 ? "14px" : cardText.length > 160 ? "15px" : "17px",
                        lineHeight: 1.55,
                      }}
                    >
                      {paragraphs.map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
                    </div>
                  </div>

                  {/* Brand mark sits on the canvas, not the card */}
                  <div className="flex items-center gap-2" style={{ color: noteCanvas.text, fontFamily: "'Inter', sans-serif" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icon-192.png" alt="" className="w-5 h-5 rounded-md" />
                    <span className="text-[12px] font-bold tracking-wide lowercase">mind-fuel.app</span>
                  </div>
                </div>
                ) : (
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
                )}
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
                        activeBg.id === "custom"
                          ? activeBg.value
                          : "#00bf63"
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        setActiveBg({
                          id: "custom",
                          name: "Custom",
                          type: "color",
                          value: val,
                          text: isColorLight(val) ? "#171717" : "#ffffff",
                        });
                      }}
                      className="absolute inset-[-10px] w-20 h-20 cursor-pointer opacity-0 z-10"
                    />
                    {activeBg.id === "custom" ? (
                      <div
                        className="w-full h-full"
                        style={{ backgroundColor: activeBg.value }}
                      />
                    ) : (
                      <div className="w-full h-full bg-[conic-gradient(red,yellow,lime,aqua,blue,magenta,red)] opacity-90" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                      <Plus className="w-4 h-4 text-white" />
                    </div>
                  </div>

                  <div className="w-px h-8 bg-border/50 flex-shrink-0 mx-1" />

                  {swatches.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setActiveBg(opt)}
                      title={opt.name}
                      aria-label={opt.name}
                      className={`w-10 h-10 rounded-full transition-all flex-shrink-0 ${
                        activeBg.id === opt.id && activeBg.id !== "custom"
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
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
