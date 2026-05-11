"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { Trash2, Heart, Loader2, Smile } from "lucide-react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

const CHAR_LIMIT = 300;

interface Comment {
  _id: string;
  content: string;
  userId: {
    _id: string;
    name: string;
    image: string;
    firebaseId: string;
    username?: string;
  };
  createdAt: string;
  likesCount: number;
  isLiked?: boolean;
}

function CommentAvatar({
  user,
  size = 36,
}: {
  user: Comment["userId"];
  size?: number;
}) {
  const [imgError, setImgError] = React.useState(false);

  if (user.image && !user.image.startsWith("#") && !imgError) {
    return (
      <Image
        src={user.image}
        width={size}
        height={size}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
        alt={user.name}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className="rounded-full bg-secondary flex items-center justify-center font-bold text-muted-foreground flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {user.name?.[0]?.toUpperCase() || "U"}
    </div>
  );
}

/** X-style SVG character-limit ring */
function CharRing({ current, limit }: { current: number; limit: number }) {
  const pct = Math.min(current / limit, 1);
  const radius = 9;
  const circ = 2 * Math.PI * radius;
  const dash = circ * pct;
  const remaining = limit - current;
  const isNearLimit = remaining <= 20;
  const isOverLimit = current > limit;

  const color = isOverLimit
    ? "#ef4444"
    : isNearLimit
      ? "#facc15"
      : "var(--brand-green)";

  return (
    <div className="relative flex items-center justify-center w-8 h-8 flex-shrink-0">
      <svg width="28" height="28" viewBox="0 0 28 28" className="-rotate-90">
        {/* Track */}
        <circle
          cx="14"
          cy="14"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="text-border"
        />
        {/* Fill */}
        <circle
          cx="14"
          cy="14"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{
            transition: "stroke-dasharray 0.15s ease, stroke 0.2s ease",
          }}
        />
      </svg>
      {/* Numeric label — only show near limit */}
      {isNearLimit && (
        <span
          className="absolute text-[9px] font-bold"
          style={{ color, lineHeight: 1 }}
        >
          {isOverLimit ? `-${-remaining}` : remaining}
        </span>
      )}
    </div>
  );
}

const CommentSection: React.FC<{
  postId: string;
  onCommentAdded?: () => void;
  onCommentDeleted?: () => void;
}> = ({ postId, onCommentAdded, onCommentDeleted }) => {
  const { user, openSignInModal } = useAuth();
  const { showToast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const url = user
          ? `/api/posts/${postId}/comments?userId=${user.uid}`
          : `/api/posts/${postId}/comments`;
        const res = await fetch(url);
        const data = await res.json();
        const validComments = (data.comments ?? []).filter(
          (c: Comment) => c.userId,
        );
        setComments(validComments);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    })();
  }, [postId, user]);

  // Close emoji picker on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      const scrollHeight = inputRef.current.scrollHeight;
      inputRef.current.style.height = Math.min(scrollHeight, 140) + "px";
    }
  }, [newComment]);

  const onEmojiClick = (emojiData: { emoji: string }) => {
    const cursor = inputRef.current?.selectionStart ?? newComment.length;
    const updated =
      newComment.slice(0, cursor) + emojiData.emoji + newComment.slice(cursor);
    setNewComment(updated);
    setShowEmojiPicker(false);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const pos = cursor + emojiData.emoji.length;
        inputRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !user ||
      !newComment.trim() ||
      submitting ||
      newComment.length > CHAR_LIMIT
    )
      return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid, content: newComment }),
      });
      const data = await res.json();
      if (res.ok) {
        setComments((prev) => [
          { ...data.comment, isLiked: false, likesCount: 0 },
          ...prev,
        ]);
        setNewComment("");
        showToast("Reflection added", "success");
        onCommentAdded?.();
      }
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm("Delete this reflection?")) return;
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c._id !== commentId));
        showToast("Reflection deleted", "success");
        onCommentDeleted?.();
      }
    } catch {}
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) {
      openSignInModal();
      return;
    }

    setComments((prev) =>
      prev.map((c) => {
        if (c._id === commentId) {
          const newIsLiked = !c.isLiked;
          return {
            ...c,
            isLiked: newIsLiked,
            likesCount: newIsLiked ? c.likesCount + 1 : c.likesCount - 1,
          };
        }
        return c;
      }),
    );

    try {
      const res = await fetch(`/api/comments/${commentId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(
          data.liked ? "Reflection liked" : "Reflection unliked",
          "success",
        );
      }
    } catch {
      // Revert on error
      setComments((prev) =>
        prev.map((c) => {
          if (c._id === commentId) {
            const revertedIsLiked = !c.isLiked;
            return {
              ...c,
              isLiked: revertedIsLiked,
              likesCount: revertedIsLiked ? c.likesCount + 1 : c.likesCount - 1,
            };
          }
          return c;
        }),
      );
    }
  };

  return (
    <div className="flex flex-col">
      {/* Comments header */}
      <div className="px-4 py-3.5 border-b border-border">
        <h3 className="font-bold text-[15px]">
          {comments.length > 0
            ? `${comments.length} Reflection${comments.length !== 1 ? "s" : ""}`
            : "Reflections"}
        </h3>
      </div>

      {/* Comment list */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-brand-green" />
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          <AnimatePresence initial={false}>
            {comments.map((comment) => (
              <motion.div
                key={comment._id}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="flex gap-3 px-4 py-3 group hover:bg-secondary/10 transition-colors"
              >
                {/* Avatar */}
                <div className="flex-shrink-0 mt-0.5">
                  <Link
                    href={`/profile/${comment.userId.firebaseId}`}
                    className="block outline-none press-scale"
                  >
                    <CommentAvatar user={comment.userId} size={38} />
                  </Link>
                </div>

                {/* Body */}
                <div className="flex-1 min-w-0">
                  {/* Name row */}
                  <div className="flex items-cent gap-1.5 flex-wrap">
                    <div className="flex flex-col gap-1">
                      <Link
                        href={`/profile/${comment.userId.firebaseId}`}
                        className="font-bold text-[14px] hover:underline leading-tight"
                      >
                        {comment.userId.name}
                      </Link>
                      <Link
                        href={`/profile/${comment.userId.firebaseId}`}
                        className="text-[13px] text-muted-foreground hover:text-foreground transition-colors leading-tight -mt-5 md:mt-0"
                      >
                        @
                        {comment.userId.username ||
                          comment.userId.name.replace(/\s+/g, "").toLowerCase()}
                      </Link>
                    </div>
                    <span className="text-muted-foreground text-[12px]">·</span>
                    <span className="text-muted-foreground text-[12px] whitespace-nowrap">
                      {formatDistanceToNow(new Date(comment.createdAt), {
                        addSuffix: false,
                      })
                        .replace("about ", "")
                        .replace("less than a minute", "now")}
                    </span>
                  </div>

                  {/* Comment text */}
                  <p className="text-[14.5px] text-foreground/90 leading-[1.55] -mt-3 md:mt-3 break-words whitespace-pre-wrap">
                    {comment.content}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center gap-4 mt-1.5">
                    <button
                      onClick={() => handleLikeComment(comment._id)}
                      className={`flex items-center gap-1.5 transition-colors press-scale group/like ${
                        comment.isLiked
                          ? "text-rose-500"
                          : "text-muted-foreground hover:text-rose-500"
                      }`}
                    >
                      <div className="p-1 rounded-full group-hover/like:bg-rose-500/10 transition-colors">
                        <Heart
                          className={`w-3.5 h-3.5 transition-all ${
                            comment.isLiked ? "fill-current" : ""
                          }`}
                          strokeWidth={comment.isLiked ? 0 : 1.75}
                        />
                      </div>
                      {comment.likesCount > 0 && (
                        <span className="text-[12px] font-semibold -ml-0.5">
                          {comment.likesCount}
                        </span>
                      )}
                    </button>
                    {user?.uid === comment.userId.firebaseId && (
                      <button
                        onClick={() => handleDelete(comment._id)}
                        className="flex items-center gap-1 text-muted-foreground hover:text-rose-500 transition-colors press-scale"
                      >
                        <div className="p-1 rounded-full hover:bg-rose-500/10 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {!loading && comments.length === 0 && (
            <div className="py-14 text-center px-6">
              <p className="text-muted-foreground text-[14px]">
                No reflections yet. Be the first to share one.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Floating Message-style Composer ── */}
      {user ? (
        <div className="sticky bottom-[64px] md:bottom-0 z-30 pb-safe px-4 py-3">
          <form
            onSubmit={handleSubmit}
            className="max-w-[600px] mx-auto w-full bg-card/70 backdrop-blur-2xl border border-border/60 rounded-[28px] shadow-[0_8px_32px_rgba(0,0,0,0.2)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden transition-all focus-within:shadow-[0_8px_32px_rgba(0,168,85,0.15)] focus-within:border-brand-green/30"
          >
            <div className="flex flex-col p-2">
              <div className="px-3 pt-2">
                <textarea
                  ref={inputRef}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="What's on your mind?"
                  rows={1}
                  className="w-full bg-transparent border-none outline-none resize-none text-[15px] placeholder:text-muted-foreground/40 leading-relaxed font-medium min-h-[54px] max-h-[160px] scrollbar-hide py-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !submitting) {
                      e.preventDefault();
                      handleSubmit(e as unknown as React.FormEvent);
                    }
                  }}
                />
              </div>

              <div className="flex items-center justify-between px-2 pb-1 pt-1">
                <div className="flex items-center gap-1">
                  {/* Emoji button */}
                  <div className="relative" ref={emojiPickerRef}>
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker((p) => !p)}
                      className="w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-brand-green hover:bg-brand-green/10 transition-all active:scale-90"
                      title="Add emoji"
                    >
                      <Smile className="w-[20px] h-[20px]" strokeWidth={2} />
                    </button>
                    <AnimatePresence>
                      {showEmojiPicker && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute bottom-full mb-4 left-0 z-50 shadow-2xl rounded-2xl overflow-hidden border border-border bg-popover"
                        >
                          <EmojiPicker
                            onEmojiClick={onEmojiClick}
                            theme={Theme.AUTO}
                            width={300}
                            height={350}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {newComment.length > 0 && (
                    <CharRing current={newComment.length} limit={CHAR_LIMIT} />
                  )}
                  <button
                    type="submit"
                    disabled={
                      !newComment.trim() ||
                      submitting ||
                      newComment.length > CHAR_LIMIT
                    }
                    className="h-9 px-5 bg-brand-green text-white font-bold rounded-full disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brand-green/90 active:scale-95 transition-all text-[13px] flex items-center gap-2"
                  >
                    {submitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      "Post"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      ) : (
        <div className="sticky bottom-[64px] md:bottom-0 z-30 pb-safe px-4 py-4">
          <div
            onClick={openSignInModal}
            className="max-w-[600px] mx-auto w-full bg-card/70 backdrop-blur-2xl border border-border/60 rounded-full px-6 py-3 text-center cursor-pointer hover:bg-secondary/30 transition-colors shadow-lg"
          >
            <p className="text-[14px] text-muted-foreground font-medium">
              <span className="text-brand-green font-bold">Sign in</span> to
              join the conversation.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommentSection;
