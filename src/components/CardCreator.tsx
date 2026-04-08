"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { toPng } from "html-to-image";
import { Download, X, Type, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/providers/ToastProvider";

const backgroundOptions = [
  { id: "obsidian",  name: "Obsidian",    type: "color",    value: "#0a0a0a",                                        text: "#ffffff" },
  { id: "paper",     name: "Paper",       type: "color",    value: "#ffffff",                                        text: "#171717" },
  { id: "mindfuel",  name: "MindFuel",    type: "gradient", value: "linear-gradient(135deg, #00bf63, #047857)",      text: "#ffffff" },
  { id: "midnight",  name: "Midnight",    type: "gradient", value: "linear-gradient(135deg, #0f172a, #1e293b)",      text: "#ffffff" },
  { id: "aurora",    name: "Aurora",      type: "gradient", value: "linear-gradient(135deg, #134e5e, #71b280)",      text: "#ffffff" },
  { id: "sakura",    name: "Sakura",      type: "gradient", value: "linear-gradient(135deg, #fff1f2, #ffe4e6)",      text: "#171717" },
  { id: "sand",      name: "Sand",        type: "color",    value: "#f5f5dc",                                        text: "#171717" },
  { id: "serenity",  name: "Serenity",    type: "gradient", value: "linear-gradient(135deg, #a5b4fc, #818cf8)",      text: "#ffffff" },
];

const fontSizes = [
  { id: "sm",  label: "S",  cls: "text-[16px] sm:text-[18px]" },
  { id: "md",  label: "M",  cls: "text-[20px] sm:text-[22px]" },
  { id: "lg",  label: "L",  cls: "text-[26px] sm:text-[30px]" },
];

const CardCreator: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [text, setText] = useState("");
  const [bg, setBg] = useState(backgroundOptions[0]);
  const [fontSize, setFontSize] = useState(fontSizes[1]);
  const [isExporting, setIsExporting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = "auto";
      textAreaRef.current.style.height = textAreaRef.current.scrollHeight + "px";
    }
  }, [text]);

  const handleExport = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      await new Promise((r) => setTimeout(r, 100));
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 3 });
      const link = document.createElement("a");
      link.download = `mindfuel-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export failed", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !text.trim() || isOverLimit || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          userId: user.uid,
          backgroundStyle: { type: bg.type, value: bg.value },
        }),
      });
      if (res.ok) {
        showToast("Reflection shared with the world", "success");
        router.push("/");
      }
    } catch (err) {
      console.error("Post failed", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const maxChars = 500;
  const charsCount = text.length;
  const charsRatio = Math.min(charsCount / maxChars, 1);
  const radius = 11;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - charsRatio * circumference;
  const isNearLimit = maxChars - charsCount <= 40;
  const isOverLimit = charsCount > maxChars;

  const bgStyle =
    bg.type === "gradient"
      ? { backgroundImage: bg.value }
      : { backgroundColor: bg.value };

  return (
    <div className="flex flex-col w-full h-[100dvh] bg-background">

      {/* Header */}
      <header className="glass-strong border-b border-border/60 flex items-center justify-between px-4 py-3 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-1 rounded-xl hover:bg-secondary/60 transition-colors press-scale"
          >
            <X className="w-5 h-5" />
          </button>
          <span className="font-bold text-[16px] tracking-tight hidden sm:inline">New Thought</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={!text.trim()}
            className="p-2 rounded-xl text-muted-foreground hover:text-brand-green hover:bg-brand-green/10 transition-colors disabled:opacity-30 press-scale"
            title="Save as image"
          >
            <Download className="w-4.5 h-4.5 w-[18px] h-[18px]" />
          </button>

          <button
            onClick={handleSubmit}
            disabled={!text.trim() || !user || isOverLimit || isSubmitting}
            className="px-5 py-2 text-white rounded-full font-bold text-[14px] tracking-wide disabled:opacity-40 bg-[#00a855] hover:bg-[#00a855] active:bg-[#00a855] transition-colors shadow-brand-sm press-scale"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 animate-spin-slow" />
                Posting…
              </span>
            ) : "Post"}
          </button>
        </div>
      </header>

      {/* Scrollable composer */}
      <div className="flex-1 overflow-y-auto px-4 py-3">

        {/* Author row */}
        <div className="flex gap-3 mb-3">
          <div className="flex-shrink-0">
            {user?.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoURL} alt="Me" className="w-9 h-9 rounded-full object-cover ring-2 ring-brand-green/20" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground font-bold text-[13px]">
                {user?.displayName?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
          </div>
          <div className="flex flex-col justify-center">
            <span className="font-bold text-[14px] leading-tight">{user?.displayName ?? "Anonymous"}</span>
            <span className="text-muted-foreground text-[12px]">
              @{user?.displayName?.replace(/\s+/g, "").toLowerCase() ?? "guest"}
            </span>
          </div>
        </div>

        {/* Live card preview */}
        <div
          ref={cardRef}
          className="relative w-full rounded-2xl shadow-card overflow-hidden border border-black/5 dark:border-white/5 min-h-[160px] transition-all duration-300"
          style={{ ...bgStyle, color: bg.text }}
        >
          {/* Watermark when exporting */}
          {isExporting && (
            <div className="absolute top-3 right-4" style={{ opacity: 0.25, color: bg.text }}>
              <p className="text-[9px] font-bold uppercase tracking-widest">MindFuel</p>
            </div>
          )}
          <textarea
            ref={textAreaRef}
            id="post-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What's fueling your mind?"
            className={`w-full bg-transparent border-none resize-none focus:ring-0 outline-none font-semibold leading-[1.45] tracking-tight placeholder:opacity-40 px-5 py-5 ${fontSize.cls}`}
            style={{ color: bg.text }}
            rows={4}
            autoFocus
          />
        </div>

        {!user && (
          <p className="text-[12px] text-muted-foreground mt-3 text-center">
            Sign in to publish your thought to the feed.
          </p>
        )}
      </div>

      {/* Bottom toolbar */}
      <div className="shrink-0 border-t border-border glass-strong px-4 py-3 pb-safe">

        {/* Background swatches */}
        <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-2 mb-2">
          {backgroundOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setBg(option)}
              title={option.name}
              className={`w-8 h-8 rounded-full transition-all flex-shrink-0 ${
                bg.id === option.id
                  ? "scale-110 ring-2 ring-foreground ring-offset-2 ring-offset-background"
                  : "opacity-75 hover:opacity-100 hover:scale-105"
              }`}
              style={{
                background: option.type === "gradient" ? option.value : option.value,
              }}
            />
          ))}
        </div>

        {/* Tools row */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">

          {/* Font size */}
          <div className="flex items-center gap-1.5">
            <Type className="w-4 h-4 text-muted-foreground" />
            <div className="flex gap-1">
              {fontSizes.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFontSize(f)}
                  className={`w-8 h-8 rounded-lg text-[13px] font-bold transition-colors ${
                    fontSize.id === f.id
                      ? "bg-brand-green text-white"
                      : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Char counter */}
          <div className="flex items-center gap-2">
            {isNearLimit && (
              <span className={`text-[12px] font-bold tabular-nums ${isOverLimit ? "text-destructive" : "text-muted-foreground"}`}>
                {maxChars - charsCount}
              </span>
            )}
            {charsCount > 0 && (
              <div className="relative w-8 h-8 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 28 28">
                  <circle cx="14" cy="14" r={radius} fill="none" stroke="hsl(var(--secondary))" strokeWidth="2.5" />
                  <circle
                    cx="14" cy="14" r={radius}
                    fill="none"
                    stroke={isOverLimit ? "hsl(var(--destructive))" : "var(--brand-green)"}
                    strokeWidth="2.5"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-150"
                  />
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardCreator;
