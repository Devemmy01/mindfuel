/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { Download, X, Type, Sparkles, Smile, ChevronDown } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Theme } from "emoji-picker-react";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
  loading: () => (
    <div className="w-[280px] h-[350px] bg-secondary/50 rounded-2xl animate-pulse" />
  ),
});
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/providers/ToastProvider";
import { backgroundOptions } from "@/lib/backgrounds";
import { fontOptions, defaultFont, type FontOption } from "@/lib/fonts";

const fontSizes = [
  { id: "sm", label: "S", cls: "text-[16px] sm:text-[18px]", px: 17 },
  { id: "md", label: "M", cls: "text-[20px] sm:text-[22px]", px: 21 },
  { id: "lg", label: "L", cls: "text-[26px] sm:text-[30px]", px: 28 },
];

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

/** Beautiful MindFuel watermark used across all cards */
export function CardWatermark({
  color,
  isVisible = false,
}: {
  color?: string;
  isVisible?: boolean;
}) {
  if (!isVisible) return null;
  return (
    <div
      className="absolute bottom-0 right-0 flex items-end gap-0 select-none pointer-events-none z-20"
      style={{ padding: "16px 18px" }}
    >
      {/* Brand mark badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          background: "rgba(0,0,0,0.18)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          borderRadius: "100px",
          padding: "5px 10px 5px 7px",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <div
          style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}
        >
          <span
            style={{
              fontSize: "14px",
              fontWeight: 600,
              letterSpacing: "0.1em",
              color: "rgba(255,255,255,0.85)",
              fontFamily: "Inter, sans-serif",
              marginTop: "2px",
            }}
          >
            www.mind-fuel.app
          </span>
        </div>
      </div>
    </div>
  );
}

const CardCreator: React.FC = () => {
  const { user, profile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [text, setText] = useState("");
  const [promptId, setPromptId] = useState<string | null>(null);
  const [promptQuestion, setPromptQuestion] = useState<string | null>(null);
  const [bg, setBg] = useState(backgroundOptions[0]);
  const [fontSize, setFontSize] = useState(fontSizes[1]);
  const [selectedFont, setSelectedFont] = useState<FontOption>(defaultFont);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const fontPickerRef = useRef<HTMLDivElement>(null);

  // Handle prompt from URL params (from onboarding/daily reflection)
  // Prompt text is locked and cannot be edited
  useEffect(() => {
    const promptParam = searchParams.get("prompt");
    const promptIdParam = searchParams.get("promptId");
    if (promptParam) {
      // Store prompt separately - not part of editable text
      setPromptQuestion(promptParam);
      setPromptId(promptIdParam);
      // Text starts empty, user only edits their reflection
      setText("");
    }
  }, [searchParams]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
      if (
        fontPickerRef.current &&
        !fontPickerRef.current.contains(e.target as Node)
      ) {
        setShowFontPicker(false);
      }
    };
    if (showEmojiPicker || showFontPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker, showFontPicker]);

  const onEmojiClick = (emojiData: { emoji: string }) => {
    const cursor = textAreaRef.current?.selectionStart ?? text.length;
    const newText =
      text.slice(0, cursor) + emojiData.emoji + text.slice(cursor);
    setText(newText);
    setTimeout(() => {
      if (textAreaRef.current) {
        textAreaRef.current.focus();
        textAreaRef.current.setSelectionRange(
          cursor + emojiData.emoji.length,
          cursor + emojiData.emoji.length,
        );
      }
    }, 0);
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = "auto";
      textAreaRef.current.style.height =
        textAreaRef.current.scrollHeight + "px";
    }
  }, [text]);

  const handleExport = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      // Wait for rendering stabilization
      await new Promise((r) => setTimeout(r, 300));
      const { toPng } = await import("html-to-image");
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
    } catch (err) {
      console.error("Export failed", err);
      showToast("Download failed, please try again", "warning");
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
          text: displayText, // Send combined text (prompt + reflection)
          userId: user.uid,
          backgroundStyle: {
            id: bg.id,
            type: bg.type,
            value: bg.value,
            text: bg.text,
          },
          fontFamily: selectedFont.id,
          promptId: promptId || undefined, // Metadata about which prompt was used
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

  const maxChars = 300;
  const charsCount = text.length;
  const charsRatio = Math.min(charsCount / maxChars, 1);
  const radius = 11;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - charsRatio * circumference;
  const isNearLimit = maxChars - charsCount <= 40;
  const isOverLimit = charsCount > maxChars;

  // Combined text for card preview (shows both prompt context and reflection)
  const displayText = promptQuestion
    ? `Reflecting on: "${promptQuestion}"\n\n${text}`
    : text;


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
          <span className="font-bold text-[16px] tracking-tight hidden sm:inline">
            New Thought
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={!text.trim() || isExporting}
            className="p-2 rounded-xl text-muted-foreground hover:text-brand-green hover:bg-brand-green/10 transition-colors disabled:opacity-30 press-scale"
            title="Save as image"
          >
            {isExporting ? (
              <Sparkles className="w-[18px] h-[18px] animate-spin-slow text-brand-green" />
            ) : (
              <Download className="w-[18px] h-[18px]" />
            )}
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
            ) : (
              "Post"
            )}
          </button>
        </div>
      </header>

      {/* Scrollable composer */}
      <div className="flex-1 overflow-y-auto px-4 py-3 scrollbar-dark">
        {/* Author row */}
        <div className="flex gap-3 mb-3">
          <div className="flex-shrink-0">
            {profile?.image || user?.photoURL ? (
              <Image
                src={profile?.image || user?.photoURL || ""}
                alt="Me"
                width={36}
                height={36}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-brand-green/20"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground font-bold text-[13px]">
                {(profile?.name || user?.displayName)?.[0]?.toUpperCase() ??
                  "?"}
              </div>
            )}
          </div>
          <div className="flex flex-col justify-center">
            <span className="font-bold text-[14px] leading-tight">
              {profile?.name || user?.displayName || "Anonymous"}
            </span>
            <span className="text-muted-foreground text-[12px]">
              @
              {profile?.username ||
                (profile?.name || user?.displayName)
                  ?.replace(/\s+/g, "")
                  .toLowerCase() ||
                "guest"}
            </span>
          </div>
        </div>

        {/* Prompt indicator - shows when responding to daily prompt (locked, not editable) */}
        {promptId && promptQuestion && (
          <div className="mb-4 px-3 py-2.5 bg-secondary/50 border border-border/50 rounded-xl shadow-sm">
            <p className="text-xs text-foreground/90 font-medium">
              Responding to: &quot;{promptQuestion}&quot;
            </p>
          </div>
        )}

        {/* Live card preview */}
        <div
          ref={cardRef}
          className={`relative w-full ${isExporting ? "!rounded-none !border-none min-w-[380px]  flex flex-col justify-center" : "rounded-2xl"} shadow-card overflow-hidden border border-black/5 dark:border-white/5 min-h-[200px] transition-all duration-300`}
          style={{ background: bg.value, color: bg.text }}
        >
          {/* Grouped content for centered alignment */}
          <div
            className={`relative z-10 w-full pt-10 ${isExporting ? "flex flex-col items-start px-8 py-2" : ""}`}
          >
            {/* Decorative quote */}
            <span
              className={
                isExporting
                  ? "relative mb-1 block text-[64px] font-black opacity-[0.08]"
                  : "thought-card-quote !left-[24px] md:!left-[32px]"
              }
              style={{ color: bg.text, fontFamily: "'Georgia', serif" }}
            >
              &ldquo;
            </span>

            {/* Locked prompt context (if responding to a reflection prompt) */}
            {promptQuestion && (
              <div
                className={`px-6 md:px-8 mb-3 italic ${fontSize.cls}`}
                style={{
                  color: bg.text === "#171717" ? "rgba(0,0,0,0.6)" : "#f5f5f5",
                  fontFamily: selectedFont.family,
                  opacity: 0.85,
                }}
              >
                <span style={{ opacity: 0.7 }}>Reflecting on:</span>
                {"\n"}&quot;{promptQuestion}&quot;
              </div>
            )}

            <textarea
              ref={textAreaRef}
              id="post-textarea"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                promptQuestion
                  ? "Share your reflection..."
                  : "What's fueling your mind?"
              }
              className={`w-full bg-transparent border-none resize-none focus:ring-0 outline-none font-semibold leading-[1.45] tracking-tight placeholder:opacity-40 px-6 md:px-8 ${isExporting ? "text-[22px] sm:text-[26px] px-0" : fontSize.cls + "pb-8"}`}
              style={{ color: bg.text, fontFamily: selectedFont.family }}
              rows={4}
              maxLength={maxChars}
              autoFocus
            />
          </div>

          {/* Always-visible watermark */}
          <CardWatermark isVisible={isExporting} />
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
          {/* Custom Color Picker */}
          <div className="relative flex-shrink-0 w-8 h-8 rounded-full overflow-hidden border border-border hover:scale-105 transition-all shadow-sm">
            <input
              type="color"
              value={bg.id === "custom" ? bg.value : "#00bf63"}
              onChange={(e) => {
                const val = e.target.value;
                setBg({
                  id: "custom",
                  name: "Custom Color",
                  type: "color",
                  value: val,
                  text: isColorLight(val) ? "#171717" : "#ffffff",
                });
              }}
              className="absolute inset-[-10px] w-12 h-12 cursor-pointer opacity-0 z-10"
              title="Pick a custom color"
            />
            {bg.id === "custom" ? (
              <div
                className="w-full h-full"
                style={{ backgroundColor: bg.value }}
              />
            ) : (
              <div className="w-full h-full bg-[conic-gradient(red,yellow,lime,aqua,blue,magenta,red)] opacity-90" />
            )}
          </div>

          <div className="w-px h-6 bg-border mx-1 flex-shrink-0" />

          {backgroundOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setBg(option)}
              title={option.name}
              className={`w-8 h-8 rounded-full transition-all flex-shrink-0 ${
                bg.id === option.id && bg.id !== "custom"
                  ? "scale-110 ring-2 ring-foreground ring-offset-2 ring-offset-background"
                  : "opacity-75 hover:opacity-100 hover:scale-105"
              }`}
              style={{
                background: option.value,
              }}
            />
          ))}
        </div>

        {/* Tools row */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          {/* Font size, Font family & Emoji */}
          <div className="flex items-center gap-3">
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

            {/* Font family picker */}
            <div className="relative" ref={fontPickerRef}>
              <button
                onClick={() => setShowFontPicker((p) => !p)}
                className={`flex items-center gap-1 px-2 h-8 rounded-lg text-[12px] font-bold transition-colors ${
                  showFontPicker
                    ? "bg-brand-green text-white"
                    : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
                }`}
                title="Change font"
              >
                <span
                  style={{ fontFamily: selectedFont.family, fontSize: "12px" }}
                >
                  Aa
                </span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>

              {showFontPicker && (
                <div className="absolute bottom-[calc(100%+8px)] left-0 z-50 bg-popover popover-solid border border-border rounded-2xl shadow-2xl p-2 flex flex-col gap-0.5 min-w-[150px] animate-scale-in">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 pb-1">
                    Font Style
                  </p>
                  {fontOptions.map((font) => (
                    <button
                      key={font.id}
                      onClick={() => {
                        setSelectedFont(font);
                        setShowFontPicker(false);
                      }}
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left transition-colors ${
                        selectedFont.id === font.id
                          ? "bg-brand-green/15 text-brand-green"
                          : "hover:bg-secondary/60 text-foreground"
                      }`}
                    >
                      <span
                        className="text-[14px] font-semibold"
                        style={{ fontFamily: font.family }}
                      >
                        {font.label}
                      </span>
                      <span
                        className="text-[12px] opacity-60"
                        style={{ fontFamily: font.family }}
                      >
                        Aa
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Emoji Trigger */}
            <div className="relative" ref={emojiPickerRef}>
              <button
                onClick={() => setShowEmojiPicker((prev) => !prev)}
                className={`p-1.5 rounded-lg transition-colors flex items-center justify-center w-8 h-8 ${showEmojiPicker ? "bg-brand-green text-white" : "bg-secondary/60 text-muted-foreground hover:bg-secondary"}`}
                title="Add emoji"
              >
                <Smile className="w-[18px] h-[18px]" strokeWidth={2.5} />
              </button>

              {showEmojiPicker && (
                <div className="absolute bottom-[calc(100%+12px)] left-0 z-50 shadow-2xl rounded-2xl overflow-hidden border border-border/50 animate-in fade-in zoom-in-95 duration-200">
                  <EmojiPicker
                    onEmojiClick={onEmojiClick}
                    theme={Theme.AUTO}
                    width={280}
                    height={350}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Char counter */}
          <div className="flex items-center gap-2">
            {isNearLimit && (
              <span
                className={`text-[12px] font-bold tabular-nums ${isOverLimit ? "text-destructive" : "text-muted-foreground"}`}
              >
                {maxChars - charsCount}
              </span>
            )}
            {charsCount > 0 && (
              <div className="relative w-8 h-8 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 28 28">
                  <circle
                    cx="14"
                    cy="14"
                    r={radius}
                    fill="none"
                    stroke="hsl(var(--secondary))"
                    strokeWidth="2.5"
                  />
                  <circle
                    cx="14"
                    cy="14"
                    r={radius}
                    fill="none"
                    stroke={
                      isOverLimit
                        ? "hsl(var(--destructive))"
                        : "var(--brand-green)"
                    }
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
