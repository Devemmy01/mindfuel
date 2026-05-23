"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, Loader2, Smile } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { Theme } from "emoji-picker-react";
import { PostType } from "@/types";
import { backgroundOptions, BackgroundStyle } from "@/lib/backgrounds";
import { FontOption, getFontById } from "@/lib/fonts";
import { CardWatermark } from "@/components/CardCreator";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { mutate } from "swr";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
  loading: () => <div className="w-[280px] h-[320px] bg-secondary/50 rounded-2xl animate-pulse" />,
});

const isColorLight = (hex: string) => {
  if (!hex || !hex.startsWith("#")) return true;
  const c = hex.substring(1);
  const rgb = parseInt(c, 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 160;
};

export interface EditSavePayload {
  text: string;
  backgroundStyle: { id: string; type: string; value: string; text: string };
  fontFamily: string;
}

interface EditPostModalProps {
  post: PostType;
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: EditSavePayload) => void;
}

export default function EditPostModal({ post, isOpen, onClose, onSave }: EditPostModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const promptPrefix = post.promptId
    ? (post.text.match(/^(Reflecting on: "[^"]+")/))?.[1] ?? null
    : null;

  const getParsedText = () => {
    if (!post.promptId) return post.text;
    const match = post.text.match(/^Reflecting on: "[^"]+"\s*([\s\S]*)$/);
    return match ? match[1].trimStart() : post.text;
  };

  const initBg = (): BackgroundStyle => {
    const postBgVal = post.backgroundStyle?.value ?? "#0a0a0a";
    const found = backgroundOptions.find((o) => o.value === postBgVal);
    return (
      found ?? {
        id: "custom",
        name: "Custom Color",
        type: "color" as const,
        value: postBgVal,
        text: isColorLight(postBgVal) ? "#171717" : "#ffffff",
      }
    );
  };

  const [editText, setEditText] = useState(getParsedText());
  const [editBg, setEditBg] = useState<BackgroundStyle>(initBg());
  const [editFont, setEditFont] = useState<FontOption>(getFontById(post.fontFamily ?? "inter"));
  const [isUpdating, setIsUpdating] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const editTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Reset state whenever the modal opens or the post changes
  useEffect(() => {
    if (isOpen) {
      setEditText(getParsedText());
      setEditBg(initBg());
      setEditFont(getFontById(post.fontFamily ?? "inter"));
      setShowEmojiPicker(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, post._id]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker]);

  const onEmojiClick = (emojiData: { emoji: string }) => {
    const cursor = editTextAreaRef.current?.selectionStart ?? editText.length;
    const updated = editText.slice(0, cursor) + emojiData.emoji + editText.slice(cursor);
    setEditText(updated);
    setShowEmojiPicker(false);
    setTimeout(() => {
      if (editTextAreaRef.current) {
        editTextAreaRef.current.focus();
        const pos = cursor + emojiData.emoji.length;
        editTextAreaRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  const handleUpdate = async () => {
    if (!user || user.uid !== post.userId.firebaseId || !editText.trim() || isUpdating) return;
    setIsUpdating(true);
    try {
      const finalText = promptPrefix ? `${promptPrefix}\n\n${editText}` : editText;
      const bgPayload = { id: editBg.id, type: editBg.type, value: editBg.value, text: editBg.text };
      const res = await fetch(`/api/posts/${post._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          text: finalText,
          backgroundStyle: bgPayload,
          fontFamily: editFont.id,
        }),
      });
      if (res.ok) {
        showToast("Thought updated!", "success");
        onSave({ text: finalText, backgroundStyle: bgPayload, fontFamily: editFont.id });
        
        // Globally revalidate feeds and the specific post
        mutate((key: unknown) => 
          (typeof key === 'string' && key.startsWith('/api/posts/feed')) || 
          (typeof key === 'string' && key.includes(`/api/posts/${post._id}`))
        );

        onClose();
      } else {
        showToast("Failed to save changes", "error");
      }
    } catch {
      showToast("Something went wrong", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="edit-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-black/95"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.97 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="bg-white dark:bg-[#111827] border border-border w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-secondary/20 rounded-t-3xl shrink-0">
              <div>
                <h3 className="text-[17px] font-bold tracking-tight">Edit Thought</h3>
                {promptPrefix && (
                  <p className="text-[12px] text-muted-foreground mt-0.5 italic truncate max-w-[220px]">
                    {promptPrefix}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-secondary/60 rounded-full transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className={`p-5 overflow-y-auto no-scrollbar flex-1 flex flex-col gap-4 ${showEmojiPicker ? "pb-80" : ""}`}>
              {/* Live Card Preview + Textarea */}
              <div
                className={`relative w-full rounded-2xl shadow-card overflow-hidden min-h-[160px] transition-all duration-300 ${
                  editText.length > 950
                    ? "border-2 border-rose-500/50 ring-2 ring-rose-500/30"
                    : editText.length > 900
                    ? "border-2 border-yellow-500/30 ring-2 ring-yellow-500/20"
                    : "border border-black/5 dark:border-white/5"
                }`}
                style={{ background: editBg.value, color: editBg.text }}
              >
                <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 mix-blend-overlay pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-20 pointer-events-none" />
                <textarea
                  ref={editTextAreaRef}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full bg-transparent border-none resize-none focus:ring-0 outline-none font-semibold leading-[1.45] tracking-tight placeholder:opacity-40 px-5 pt-5 pb-14 text-[18px] scrollbar-dark relative z-10"
                  style={{ color: editBg.text, fontFamily: editFont.family }}
                  rows={4}
                  maxLength={1010}
                  autoFocus
                  placeholder="What's on your mind?"
                />
                <CardWatermark color={editBg.text} />
              </div>

              {/* Character count */}
              <div className="flex items-center justify-between -mt-2 px-1">
                <span
                  className={`text-[12px] font-semibold transition-colors ${
                    editText.length > 1000
                      ? "text-rose-500"
                      : editText.length > 950
                      ? "text-rose-500/70"
                      : editText.length > 900
                      ? "text-yellow-500/70"
                      : "text-muted-foreground/60"
                  }`}
                >
                  {editText.length}/1000
                </span>
                {editText.length > 1000 && (
                  <p className="text-[12px] text-rose-500 font-semibold">
                    Over limit by {editText.length - 1000}
                  </p>
                )}
              </div>

              {/* Emoji row */}
              <div className="flex items-center gap-3 relative" ref={emojiPickerRef}>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((p) => !p)}
                  className={`p-2 rounded-xl transition-colors shrink-0 ${
                    showEmojiPicker
                      ? "text-brand-green bg-brand-green/10"
                      : "text-muted-foreground hover:bg-secondary"
                  }`}
                  title="Add emoji"
                >
                  <Smile className="w-5 h-5" strokeWidth={2} />
                </button>

                <AnimatePresence>
                  {showEmojiPicker && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className="absolute top-full left-0 mt-2 z-[9999] shadow-2xl rounded-2xl border border-border/50 bg-background min-w-[320px]"
                    >
                      <EmojiPicker onEmojiClick={onEmojiClick} theme={Theme.AUTO} width="100%" height={350} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>


              {/* Action buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={onClose}
                  className="flex-[1] py-3.5 bg-secondary/60 text-foreground font-bold rounded-2xl hover:bg-secondary transition-all press-scale"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={isUpdating || !editText.trim() || editText.length > 1000}
                  className="flex-[2] py-3.5 text-white font-bold rounded-2xl bg-[#00a855] hover:bg-[#00a855]/80 disabled:opacity-50 transition-all shadow-brand-sm press-scale flex items-center justify-center gap-2 relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:translate-x-full duration-1000 -translate-x-full transition-transform" />
                  {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Save Changes
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
