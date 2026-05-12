/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { X, Smile, Image as ImageIcon, Trash2, Plus, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Theme } from "emoji-picker-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/providers/ToastProvider";
import { backgroundOptions } from "@/lib/backgrounds";
import { PostType } from "@/types";
import { getFontById } from "@/lib/fonts";

import QuotedPostPreview from "@/components/QuotedPostPreview";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
  loading: () => <div className="w-[280px] h-[350px] bg-secondary/50 rounded-2xl animate-pulse" />,
});

/** Re-exported for use in DownloadCardModal */
export function CardWatermark({ color = "#ffffff", isVisible = false }: { color?: string; isVisible?: boolean }) {
  if (!isVisible) return null;
  return (
    <div className="absolute bottom-0 right-0 flex items-end select-none pointer-events-none z-20" style={{ padding: "16px 18px" }}>
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full"
        style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.05em", color: "rgba(255,255,255,0.9)", fontFamily: "Inter, sans-serif", textTransform: "lowercase" }}>
          mind-fuel.app
        </span>
      </div>
    </div>
  );
}



const CardCreator: React.FC = () => {
  const { user, profile, openSignInModal } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [text, setText] = useState("");
  const [promptId, setPromptId] = useState<string | null>(null);
  const [promptQuestion, setPromptQuestion] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [quotedPost, setQuotedPost] = useState<PostType | null>(null);

  // Image upload
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Load prompt or quote from URL
  useEffect(() => {
    const promptParam = searchParams.get("prompt");
    const promptIdParam = searchParams.get("promptId");
    const quoteIdParam = searchParams.get("quoteId");

    if (promptParam) {
      setPromptQuestion(promptParam);
      setPromptId(promptIdParam);
      setText("");
    }

    if (quoteIdParam) {
      fetch(`/api/posts/${quoteIdParam}`)
        .then((res) => res.json())
        .then((data) => setQuotedPost(data.post))
        .catch((err) => console.error("Failed to fetch quoted post", err));
    }
  }, [searchParams]);

  // Close emoji picker on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node))
        setShowEmojiPicker(false);
    };
    if (showEmojiPicker) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker]);

  // Auto-resize textarea
  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = "auto";
      textAreaRef.current.style.height = textAreaRef.current.scrollHeight + "px";
    }
  }, [text]);

  const onEmojiClick = (emojiData: { emoji: string }) => {
    const cursor = textAreaRef.current?.selectionStart ?? text.length;
    const newText = text.slice(0, cursor) + emojiData.emoji + text.slice(cursor);
    setText(newText);
    setTimeout(() => {
      if (textAreaRef.current) {
        textAreaRef.current.focus();
        textAreaRef.current.setSelectionRange(cursor + emojiData.emoji.length, cursor + emojiData.emoji.length);
      }
    }, 0);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { 
      showToast("Image must be under 5MB", "warning"); 
      return; 
    }

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    // Upload to Cloudinary
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      setImageUrl(url);
    } catch {
      showToast("Image upload failed", "error");
      setImagePreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const maxChars = 500;
  const charsCount = text.length;
  const charsRatio = Math.min(charsCount / maxChars, 1);
  const radius = 11;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - charsRatio * circumference;
  const isNearLimit = maxChars - charsCount <= 40;
  const isOverLimit = charsCount > maxChars;

  const displayText = promptQuestion ? `Reflecting on: "${promptQuestion}"\n\n${text}` : text;

  const handleSubmit = async () => {
    if (!user) { openSignInModal(); return; }
    if (!text.trim() || isOverLimit || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: displayText,
          userId: user.uid,
          backgroundStyle: { id: "obsidian", type: "color", value: "#0a0a0a", text: "#ffffff" },
          fontFamily: "inter",
          promptId: promptId || undefined,
          imageUrl: imageUrl || undefined,
          quotedPostId: quotedPost?._id || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const postId = data.post._id;
        showToast(
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            Post created.{" "}
            {/* <Link href={`/post/${postId}`} className="font-bold underline hover:text-brand-green">View</Link> */}
          </span>,
          "success", 5000
        );
        router.push("/");
      }
    } catch (err) {
      console.error("Post failed", err);
      showToast("Failed to post, please try again", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const avatarSrc = profile?.image || user?.photoURL;
  const displayName = profile?.name || user?.displayName || "Anonymous";
  const handle = profile?.username || displayName.replace(/\s+/g, "").toLowerCase();

  return (
    <div className="flex flex-col w-full h-[100dvh] bg-background">
      {/* Header */}
      <header className="glass-strong border-b border-border/60 flex items-center justify-between px-4 py-3 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-1 rounded-xl hover:bg-secondary/60 transition-colors press-scale">
            <X className="w-5 h-5" />
          </button>
          <span className="font-bold text-[16px] tracking-tight hidden sm:inline">New Post</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Char counter ring */}
          {charsCount > 0 && (
            <div className="relative w-8 h-8 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 28 28">
                <circle cx="14" cy="14" r={radius} fill="none" stroke="hsl(var(--secondary))" strokeWidth="2.5" />
                <circle cx="14" cy="14" r={radius} fill="none"
                  stroke={isOverLimit ? "hsl(var(--destructive))" : "var(--brand-green)"}
                  strokeWidth="2.5" strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset} strokeLinecap="round"
                  className="transition-all duration-150"
                />
              </svg>
              {isNearLimit && (
                <span className={`absolute text-[9px] font-bold tabular-nums ${isOverLimit ? "text-destructive" : "text-muted-foreground"}`}>
                  {maxChars - charsCount}
                </span>
              )}
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || isOverLimit || isSubmitting || isUploading}
            className="px-5 py-2 text-white rounded-full font-bold text-[14px] tracking-wide disabled:opacity-40 bg-[#00a855] transition-colors shadow-brand-sm press-scale"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Posting…
              </span>
            ) : "Post"}
          </button>
        </div>
      </header>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto scrollbar-dark">
        <div className="flex gap-3 px-4 pt-4">
          {/* Avatar column */}
          <div className="flex flex-col items-center flex-shrink-0">
            {avatarSrc ? (
              <Image src={avatarSrc} alt="Me" width={40} height={40} className="w-10 h-10 rounded-full object-cover ring-2 ring-brand-green/20" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-[14px]">
                {displayName[0]?.toUpperCase() ?? "?"}
              </div>
            )}
          </div>

          {/* Content column */}
          <div className="flex-1 min-w-0 pb-4">
            <div className="flex flex-col gap-1.5 mb-2">
              <span className="font-bold text-[15px]">{displayName}</span>
              <span className="text-muted-foreground text-[13px] -mt-2">@{handle}</span>
            </div>

            {/* Prompt context */}
            {promptId && promptQuestion && (
              <div className="mb-3 px-3 py-2.5 bg-secondary/50 border border-border/50 rounded-xl">
                <p className="text-xs text-muted-foreground font-medium">
                  Responding to: &ldquo;{promptQuestion}&rdquo;
                </p>
              </div>
            )}

            {/* Textarea */}
            <textarea
              ref={textAreaRef}
              id="post-textarea"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={promptQuestion ? "Share your reflection…" : "What's fueling your mind?"}
              className="w-full bg-transparent border-none resize-none focus:ring-0 outline-none text-[17px] leading-relaxed placeholder:text-muted-foreground/50 min-h-[120px]"
              rows={4}
              maxLength={maxChars}
              autoFocus
            />
            
            {/* Quoted Post Preview */}
            {quotedPost && (
              <QuotedPostPreview post={quotedPost} />
            )}

            {/* Image preview with enhanced visibility */}
            {imagePreview && (
              <div className="relative rounded-3xl overflow-hidden border border-border shadow-md ring-1 ring-black/5 dark:ring-white/5">
                <Image 
                  src={imagePreview} 
                  alt="Preview" 
                  width={800} 
                  height={600} 
                  className="w-full object-cover max-h-[400px] hover:scale-[1.02] transition-transform duration-500" 
                />
                {isUploading && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3">
                    
                    <span className="text-white text-xs font-bold tracking-widest uppercase">Uploading...</span>
                  </div>
                )}
                <button
                  onClick={removeImage}
                  className="absolute top-3 right-3 px-2.5 md:p-2 bg-black/60 hover:bg-black/80 rounded-full transition-all hover:scale-110 active:scale-95 group"
                  aria-label="Remove image"
                >
                  <X className="w-4 h-4 text-white group-hover:rotate-90 transition-transform" />
                </button>
              </div>
            )}

            {!user && (
              <p className="text-[12px] text-muted-foreground mt-3 text-center">
                Sign in to publish your thought to the feed.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom toolbar */}
      <div className="shrink-0 border-t border-border glass-strong px-4 py-3 pb-safe flex items-center justify-between">
        <div className="flex items-center gap-1">
          {/* Image upload */}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} id="image-upload" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!!imagePreview}
            title="Attach image"
            className="p-2 rounded-xl text-muted-foreground hover:text-brand-green hover:bg-brand-green/10 transition-colors disabled:opacity-30 press-scale"
          >
            <ImageIcon className="w-[20px] h-[20px]" strokeWidth={1.75} />
          </button>

          {/* Emoji picker */}
          <div className="relative" ref={emojiPickerRef}>
            <button
              onClick={() => setShowEmojiPicker((p) => !p)}
              title="Add emoji"
              className={`p-2 rounded-xl transition-colors press-scale ${
                showEmojiPicker ? "text-brand-green bg-brand-green/10" : "text-muted-foreground hover:text-brand-green hover:bg-brand-green/10"
              }`}
            >
              <Smile className="w-[20px] h-[20px]" strokeWidth={1.75} />
            </button>
            {showEmojiPicker && (
              <div className="absolute bottom-[calc(100%+12px)] left-0 z-50 shadow-2xl rounded-2xl overflow-hidden border border-border/50 animate-in fade-in zoom-in-95 duration-200">
                <EmojiPicker onEmojiClick={onEmojiClick} theme={Theme.AUTO} width={280} height={350} />
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-border mx-2" />

        {/* "Everyone can reply" indicator */}
        <span className="text-[12px] text-brand-green font-semibold">Everyone can reply</span>
      </div>
    </div>
  );
};

export default CardCreator;
