"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { Heart, Loader2, Smile, CornerDownRight } from "lucide-react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";

const CHAR_LIMIT = 300;

interface CommentUser {
  _id: string;
  name: string;
  image: string;
  firebaseId: string;
  username?: string;
}

interface Comment {
  _id: string;
  content: string;
  userId: CommentUser;
  parentId?: string | null;
  createdAt: string;
  likesCount: number;
  isLiked?: boolean;
}

// ── Avatar ──────────────────────────────────────────────
function CommentAvatar({ user, size = 36 }: { user: CommentUser; size?: number }) {
  const [err, setErr] = React.useState(false);
  if (user.image && !user.image.startsWith("#") && !err) {
    return (
      <Image src={user.image} width={size} height={size}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }} alt={user.name}
        onError={() => setErr(true)} />
    );
  }
  return (
    <div className="rounded-full bg-secondary flex items-center justify-center font-bold text-muted-foreground flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {user.name?.[0]?.toUpperCase() || "U"}
    </div>
  );
}

// ── Char Ring ────────────────────────────────────────────
function CharRing({ current, limit }: { current: number; limit: number }) {
  const pct = Math.min(current / limit, 1);
  const r = 9, circ = 2 * Math.PI * r;
  const remaining = limit - current;
  const over = current > limit;
  const near = remaining <= 20;
  const color = over ? "#ef4444" : near ? "#facc15" : "var(--brand-green)";
  return (
    <div className="relative flex items-center justify-center w-8 h-8 flex-shrink-0">
      <svg width="28" height="28" viewBox="0 0 28 28" className="-rotate-90">
        <circle cx="14" cy="14" r={r} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-border" />
        <circle cx="14" cy="14" r={r} fill="none" stroke={color} strokeWidth="2.5"
          strokeDasharray={`${circ * pct} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.15s ease, stroke 0.2s ease" }} />
      </svg>
      {near && <span className="absolute text-[9px] font-bold" style={{ color }}>{over ? `-${-remaining}` : remaining}</span>}
    </div>
  );
}

// ── Mini Composer ─────────────────────────────────────────
function Composer({
  onSubmit, placeholder = "Post your reply", submitLabel = "Reply",
  autoFocus = false, compact = false,
}: {
  onSubmit: (content: string) => Promise<void>;
  placeholder?: string; submitLabel?: string;
  autoFocus?: boolean; compact?: boolean;
}) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const [pickerStyle, setPickerStyle] = useState<{ left: number; top: number } | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const openTimestamp = useRef<number | null>(null);

  useEffect(() => { if (autoFocus) setTimeout(() => inputRef.current?.focus(), 60); }, [autoFocus]);
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + "px";
    }
  }, [text]);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      // ignore events that occur immediately after opening (event ordering)
      if (openTimestamp.current && Date.now() - openTimestamp.current < 200) return;
      const t = e.target as Node;
      if (emojiRef.current && emojiRef.current.contains(t)) return;
      if (pickerRef.current && pickerRef.current.contains(t)) return;
      setShowEmoji(false);
      openTimestamp.current = null;
    };
    if (showEmoji) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showEmoji]);

  useEffect(() => {
    if (!showEmoji) {
      setPickerStyle(null);
      return;
    }
    const compute = () => {
      const el = emojiRef.current?.querySelector("button");
      if (!el) return setPickerStyle(null);
      const rect = (el as HTMLElement).getBoundingClientRect();
      const pickerW = 280, pickerH = 320, margin = 8;
      let left = rect.left + rect.width / 2 - pickerW / 2;
      left = Math.max(margin, Math.min(window.innerWidth - pickerW - margin, left));
      let top = rect.top - pickerH - 12;
      // if not enough space above, place below the button
      if (top < margin) top = rect.bottom + 12;
      setPickerStyle({ left, top });
    };
    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("orientationchange", compute);
    return () => { window.removeEventListener("resize", compute); window.removeEventListener("orientationchange", compute); };
  }, [showEmoji]);

  const onEmojiClick = (d: { emoji: string }) => {
    const cur = inputRef.current?.selectionStart ?? text.length;
    const next = text.slice(0, cur) + d.emoji + text.slice(cur);
    setText(next);
    setShowEmoji(false);
    setTimeout(() => { if (inputRef.current) { inputRef.current.focus(); const p = cur + d.emoji.length; inputRef.current.setSelectionRange(p, p); } }, 0);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || submitting || text.length > CHAR_LIMIT) return;
    setSubmitting(true);
    try { await onSubmit(text); setText(""); } finally { setSubmitting(false); }
  };

  const emojiPicker =
    showEmoji && typeof document !== "undefined"
      ? createPortal(
          <AnimatePresence>
            <motion.div
              ref={pickerRef}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              style={{
                position: "fixed",
                left: pickerStyle ? pickerStyle.left : "50%",
                top: pickerStyle ? pickerStyle.top : undefined,
                transform: pickerStyle ? undefined : "translateX(-50%)",
                bottom: pickerStyle ? undefined : 84,
              }}
              className="z-[100000] shadow-2xl rounded-2xl overflow-hidden border border-border bg-popover"
            >
              <EmojiPicker onEmojiClick={onEmojiClick} theme={Theme.AUTO} width={280} height={320} />
            </motion.div>
          </AnimatePresence>,
          document.body
        )
      : null;

  return (
    <form onSubmit={submit}
      className={`w-full bg-transparent border-none overflow-hidden transition-all ${compact ? "" : ""}`}>
      <div className="flex flex-col">
        <div className="pt-1">
          <textarea ref={inputRef} value={text} onChange={e => setText(e.target.value)}
            placeholder={placeholder} rows={1}
            className={`w-full bg-transparent border-none outline-none resize-none placeholder:text-muted-foreground/40 leading-relaxed font-medium scrollbar-hide py-1 ${compact ? "text-[14px] min-h-[30px] max-h-[100px]" : "text-[15px] min-h-[50px] max-h-[140px]"}`}
            onKeyDown={e => {
              const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
              if (e.key === "Enter" && !e.shiftKey && !submitting && !isMobile) {
                e.preventDefault();
                submit(e as unknown as React.FormEvent);
              }
            }} />
        </div>
        <div className="flex items-center justify-between pb-1 pt-1">
          <div className="relative" ref={emojiRef}>
            <button type="button" onClick={() => {
                setShowEmoji(p => {
                  const next = !p;
                  if (next) openTimestamp.current = Date.now(); else openTimestamp.current = null;
                  return next;
                });
              }}
              aria-label="Open emoji picker"
              aria-expanded={showEmoji}
              className="w-8 h-8 flex items-center justify-center rounded-full text-brand-green hover:bg-brand-green/10 transition-all active:scale-90">
              <Smile className="w-[18px] h-[18px]" strokeWidth={2} />
            </button>
            {emojiPicker}
          </div>
          <div className="flex items-center gap-2">
            {text.length > 0 && <CharRing current={text.length} limit={CHAR_LIMIT} />}
            <button type="submit" disabled={!text.trim() || submitting || text.length > CHAR_LIMIT}
              className={`px-4 bg-brand-green text-white font-bold rounded-full disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brand-green/90 active:scale-95 transition-all flex items-center gap-1.5 ${compact ? "h-8 text-[12px]" : "h-9 text-[13px]"}`}>
              {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : submitLabel}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

// ── Recursive Comment Node ────────────────────────────
function CommentNode({
  comment, repliesMap, currentUser, level = 0, replyingTo,
  expandedIds, toggleExpand,
  onLike, onDelete, onReply, onSubmitReply, onEdit, editingId, onToggleEdit,
}: {
  comment: Comment;
  repliesMap: Map<string, Comment[]>;
  currentUser: { uid: string } | null;
  level?: number;
  replyingTo: Comment | null;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  onLike: (id: string) => void;
  onDelete: (id: string) => void;
  onReply: (c: Comment) => void;
  onSubmitReply: (content: string) => Promise<void>;
  onEdit: (id: string, content: string) => Promise<void>;
  editingId: string | null;
  onToggleEdit: (id: string) => void;
}) {
  const isExpanded = expandedIds.has(comment._id);
  const replies = repliesMap.get(comment._id) ?? [];
  const hasReplies = replies.length > 0;
  const isReplyingHere = replyingTo?._id === comment._id;
  const isEditingThis = editingId === comment._id;
  const [editText, setEditText] = useState(comment.content);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  
  const timeAgo = (d: string) =>
    formatDistanceToNow(new Date(d), { addSuffix: false })
      .replace("about ", "").replace("less than a minute", "now");
  const username = (u: CommentUser) => u.username || u.name.replace(/\s+/g, "").toLowerCase();

  const indentClass = level > 0 ? "ml-3 md:ml-10 border-l border-border/30" : "";

  const handleEditSubmit = async () => {
    if (!editText.trim()) return;
    setIsSubmittingEdit(true);
    try {
      await onEdit(comment._id, editText);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  return (
    <div className={`${indentClass} group transition-all`}>
      <div className={`flex gap-2.5 px-3 md:px-4 ${level === 0 ? "pt-3 pb-1" : "pt-2 pb-1"}`}>
        <Link href={`/profile/${comment.userId.firebaseId}`} className="outline-none shrink-0">
          <CommentAvatar user={comment.userId} size={level === 0 ? 36 : 28} />
        </Link>
        
        <div className="flex-1 pt-3 min-w-0">
          <div className="flex gap-2.5">
            <Link href={`/profile/${comment.userId.firebaseId}`} className="font-bold text-[14px] md:text-[15px] hover:underline leading-none">{comment.userId.name}</Link>
            <span className="text-muted-foreground text-[13px] leading-none opacity-70 pt-0.4">{timeAgo(comment.createdAt)}</span>
          </div>
          
          {!isEditingThis ? (
            <p className={`${level === 0 ? "text-[14px]" : "text-[13.5px]"} text-foreground/90 leading-snug -mt-3 md:mt-1.5 whitespace-pre-wrap`}>
              {comment.content}
            </p>
          ) : (
            <div className="mt-2 space-y-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full bg-secondary/50 border border-border/30 rounded-lg p-2 text-[13px] text-foreground resize-none"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleEditSubmit}
                  disabled={isSubmittingEdit}
                  className="px-3 py-1 bg-brand-green text-white text-[12px] font-bold rounded hover:bg-brand-green/90 disabled:opacity-50 transition-colors"
                >
                  {isSubmittingEdit ? <Loader2 className="w-3 h-3 animate-spin inline" /> : "Save"}
                </button>
                <button
                  onClick={() => {
                    setEditText(comment.content);
                    onToggleEdit(comment._id);
                  }}
                  className="px-3 py-1 text-[12px] font-bold text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-4 mt-0.5 md:mt-2">
            <div className="flex items-center gap-3">
              <button onClick={() => onReply(comment)}
                className="flex items-center gap-1 text-[12px] md:text-[13px] font-bold text-brand-green/80 hover:text-brand-green transition-colors">
                <CornerDownRight className="w-3 h-3" />
                Reply
              </button>
              
              {currentUser?.uid === comment.userId.firebaseId && (
                <>
                  <button onClick={() => onToggleEdit(comment._id)}
                    disabled={isSubmittingEdit}
                    className="text-[12px] md:text-[13px] font-medium text-muted-foreground/60 hover:text-blue-500 transition-colors disabled:opacity-50">
                    {isEditingThis ? "Cancel Edit" : "Edit"}
                  </button>
                  <button onClick={() => onDelete(comment._id)} className="text-[12px] md:text-[13px] font-medium text-muted-foreground/60 hover:text-rose-500 transition-colors">Delete</button>
                </>
              )}
            </div>
            
            <div className="flex-1" />
            
            <button onClick={() => onLike(comment._id)}
              className={`flex items-center gap-1 transition-colors ${comment.isLiked ? "text-rose-500" : "text-muted-foreground/60 hover:text-rose-500"}`}>
              <Heart className={`w-4 h-4 ${comment.isLiked ? "fill-current" : ""}`} />
              <span className="text-[12px] md:text-[13px] font-bold">{comment.likesCount}</span>
            </button>
          </div>

          {/* Inline Show/Hide Toggle */}
          {hasReplies && (
            <button onClick={() => toggleExpand(comment._id)}
              className="-mt-0.5 md:mt-2.5 text-[11px] font-bold text-brand-green/60 hover:text-brand-green flex items-center gap-1 pb-1">
              {isExpanded ? "Hide replies" : `Show ${replies.length} ${replies.length === 1 ? "reply" : "replies"}`}
            </button>
          )}
        </div>
      </div>

      {/* Inline Reply Composer */}
      {isReplyingHere && currentUser && (
        <div className="ml-6 md:ml-14 px-3 md:px-4 pb-3">
          <div className="bg-secondary/10 rounded-xl p-2 border border-border/20">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] md:text-[12px] text-muted-foreground">Replying to <span className="text-brand-green font-bold">@{username(comment.userId)}</span></span>
              <button onClick={() => onReply(comment)} className="text-[10px] font-bold text-muted-foreground/60 hover:text-foreground">Cancel</button>
            </div>
            <Composer onSubmit={onSubmitReply} placeholder="Post your reply" compact autoFocus />
          </div>
        </div>
      )}

      {/* Render children recursively if expanded */}
      <AnimatePresence>
        {isExpanded && hasReplies && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            {replies.map(reply => (
              <CommentNode
                key={reply._id}
                comment={reply}
                repliesMap={repliesMap}
                currentUser={currentUser}
                level={level + 1}
                replyingTo={replyingTo}
                expandedIds={expandedIds}
                toggleExpand={toggleExpand}
                onLike={onLike}
                onDelete={onDelete}
                onReply={onReply}
                onSubmitReply={onSubmitReply}
                onEdit={onEdit}
                editingId={editingId}
                onToggleEdit={onToggleEdit}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────
const CommentSection: React.FC<{
  postId: string;
  onCommentAdded?: () => void;
  onCommentDeleted?: () => void;
}> = ({ postId, onCommentAdded, onCommentDeleted }) => {
  const { user, profile, openSignInModal } = useAuth();
  const { showToast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const url = user ? `/api/posts/${postId}/comments?userId=${user.uid}` : `/api/posts/${postId}/comments`;
        const res = await fetch(url);
        const data = await res.json();
        const items = (data.comments ?? []).filter((c: Comment) => c.userId);
        setComments(items);
        // Expand top level by default
        const topIds = items.filter((c: Comment) => !c.parentId).map((c: Comment) => c._id);
        setExpandedIds(new Set(topIds));
      } catch { /* silent */ } finally { setLoading(false); }
    })();
  }, [postId, user]);

  const topLevel = comments.filter(c => !c.parentId);
  const repliesMap = new Map<string, Comment[]>();
  comments.forEach(c => {
    if (c.parentId) {
      const pId = String(c.parentId);
      const arr = repliesMap.get(pId) ?? [];
      arr.push(c);
      repliesMap.set(pId, arr);
    }
  });

  const handleSubmitTop = async (content: string) => {
    if (!user) return;
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.uid, content }),
    });
    const data = await res.json();
    if (res.ok) {
      const newComment = { ...data.comment, isLiked: false, likesCount: 0 };
      setComments(prev => [...prev, newComment]);
      setExpandedIds(prev => new Set([...prev, newComment._id]));
      showToast("Reflection shared", "success");
      onCommentAdded?.();
    }
  };

  const handleSubmitReply = async (content: string) => {
    if (!user || !replyingTo) return;
    const pId = replyingTo._id;
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.uid, content, parentId: pId }),
    });
    const data = await res.json();
    if (res.ok) {
      const newComment = { ...data.comment, isLiked: false, likesCount: 0 };
      setComments(prev => [...prev, newComment]);
      // CRITICAL: Auto-expand the parent so the new reply is visible
      setExpandedIds(prev => new Set([...prev, pId]));
      setReplyingTo(null);
      showToast("Reply shared", "success");
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm("Delete this reflection?")) return;
    const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
    if (res.ok) {
      setComments(prev => prev.filter(c => c._id !== commentId && c.parentId !== commentId));
      showToast("Reflection deleted", "success");
      onCommentDeleted?.();
    }
  };

  const handleEdit = async (commentId: string, content: string) => {
    if (!user) return;
    const res = await fetch(`/api/comments/${commentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.uid, content }),
    });
    if (res.ok) {
      const data = await res.json();
      setComments(prev =>
        prev.map(c => (c._id === commentId ? { ...c, content: data.comment.content } : c))
      );
      setEditingId(null);
      showToast("Reflection updated", "success");
    } else {
      showToast("Failed to update reflection", "error");
    }
  };

  const toggleEditMode = (commentId: string) => {
    setEditingId(prev => prev === commentId ? null : commentId);
  };

  const handleLike = async (commentId: string) => {
    if (!user) { openSignInModal(); return; }
    setComments(prev => prev.map(c =>
      c._id === commentId ? { ...c, isLiked: !c.isLiked, likesCount: c.isLiked ? c.likesCount - 1 : c.likesCount + 1 } : c
    ));
    try {
      await fetch(`/api/comments/${commentId}/like`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      });
    } catch {
      setComments(prev => prev.map(c =>
        c._id === commentId ? { ...c, isLiked: !c.isLiked, likesCount: c.isLiked ? c.likesCount - 1 : c.likesCount + 1 } : c
      ));
    }
  };

  const handleReply = (comment: Comment) => {
    if (!user) { openSignInModal(); return; }
    setReplyingTo(prev => prev?._id === comment._id ? null : comment);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < 100) {
        setIsVisible(true);
        return;
      }
      if (currentScrollY > lastScrollY.current) {
        setIsVisible(false); // Scrolling down
      } else {
        setIsVisible(true); // Scrolling up
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const currentUserImage = profile?.image || user?.photoURL;
  const currentUserInitial = profile?.name?.[0] || user?.displayName?.[0] || "Y";

  return (
    <div className="flex flex-col pb-32 md:pb-40">
      <div className="px-4 py-3.5 border-b border-border/50">
        <h3 className="font-bold text-[16px] tracking-tight">
          {topLevel.length > 0 ? `${topLevel.length} Reflection${topLevel.length !== 1 ? "s" : ""}` : "Reflections"}
        </h3>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand-green" /></div>
      ) : (
        <div className="flex flex-col">
          {topLevel.map(comment => (
            <CommentNode
              key={comment._id}
              comment={comment}
              repliesMap={repliesMap}
              currentUser={user}
              replyingTo={replyingTo}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
              onLike={handleLike}
              onDelete={handleDelete}
              onReply={handleReply}
              onSubmitReply={handleSubmitReply}
              onEdit={handleEdit}
              editingId={editingId}
              onToggleEdit={toggleEditMode}
            />
          ))}
          {!loading && topLevel.length === 0 && (
            <div className="py-20 text-center px-6">
              <p className="text-muted-foreground text-[15px]">
                No reflections yet. Be the first to share one.
              </p>
            </div>
          )}
        </div>
      )}

      {user && (
        <AnimatePresence>
          {isVisible && (
            <motion.div
              initial={{ y: 150, x: "-50%", opacity: 0.5 }}
              animate={{ y: 0, x: "-50%", opacity: 1 }}
              exit={{ y: 150, x: "-50%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="fixed bottom-[100px] md:bottom-10 left-1/2 w-full max-w-[500px] px-3 z-50 will-change-transform"
            >
              <div className="bg-[#0f171a]/95 backdrop-blur-3xl border border-white/10 rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-1.5">
                <div className="flex items-center gap-2 px-2">
                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-full overflow-hidden flex-shrink-0">
                      {currentUserImage ? (
                        <Image src={currentUserImage} width={36} height={36} alt="You" className="object-cover w-full h-full" />
                      ) : (
                        <div className="w-full h-full bg-brand-green flex items-center justify-center font-bold text-white text-[12px]">
                          {currentUserInitial.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <Composer onSubmit={handleSubmitTop} placeholder="Share your reflection..." submitLabel="Post" />
                    </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};

export default CommentSection;
