"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { Send, Trash2, User as UserIcon, Heart, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface Comment {
  _id: string;
  content: string;
  userId: {
    _id: string;
    name: string;
    image: string;
    firebaseId: string;
  };
  createdAt: string;
  likesCount: number;
  isLiked?: boolean;
}

const CommentSection: React.FC<{ postId: string }> = ({ postId }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    (async () => {
      try {
        const url = user
          ? `/api/posts/${postId}/comments?userId=${user.uid}`
          : `/api/posts/${postId}/comments`;
        const res = await fetch(url);
        const data = await res.json();
        setComments(data.comments ?? []);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    })();
  }, [postId, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid, content: newComment }),
      });
      const data = await res.json();
      if (res.ok) {
        setComments((prev) => [{ ...data.comment, isLiked: false, likesCount: 0 }, ...prev]);
        setNewComment("");
        showToast("Reflection added", "success");
      }
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm("Delete this comment?")) return;
    try {
      const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c._id !== commentId));
        showToast("Reflection deleted", "success");
      }
    } catch {}
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) return;

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
      })
    );

    try {
      const res = await fetch(`/api/comments/${commentId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.liked ? "Reflection liked" : "Reflection unliked", "success");
      }
    } catch {
      // Revert if error
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
        })
      );
    }
  };

  return (
    <div className="flex flex-col">

      {/* Comments header */}
      <div className="px-4 py-3.5 border-b border-border">
        <h3 className="font-bold text-[15px]">
          {comments.length > 0 ? `${comments.length} Reflection${comments.length !== 1 ? "s" : ""}` : "Reflections"}
        </h3>
      </div>

      {/* Comment list */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-brand-green" />
        </div>
      ) : (
        <div className="divide-y divide-border">
          <AnimatePresence initial={false}>
            {comments.map((comment) => (
              <motion.div
                key={comment._id}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="flex gap-3 px-4 py-3.5 group hover:bg-secondary/20 transition-colors"
              >
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {comment.userId.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={comment.userId.image}
                      className="w-9 h-9 rounded-full object-cover"
                      alt={comment.userId.name}
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                      <UserIcon className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-1.5 min-w-0">
                      <span className="font-bold text-[13px] truncate">{comment.userId.name}</span>
                      <span className="text-muted-foreground text-[12px] truncate">
                        @{comment.userId.name.replace(/\s+/g, "").toLowerCase()}
                      </span>
                    </div>
                    <span className="text-muted-foreground text-[11px] flex-shrink-0 whitespace-nowrap">
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: false })
                        .replace("about ", "")
                        .replace("less than a minute", "now")}
                    </span>
                  </div>
                  <p className="text-[14px] text-foreground/90 leading-[1.5] mt-0.5 break-words">
                    {comment.content}
                  </p>

                  {/* Comment actions */}
                  <div className="flex items-center gap-4 mt-2">
                    <button 
                      onClick={() => handleLikeComment(comment._id)}
                      className={`flex items-center gap-1.5 transition-colors press-scale ${comment.isLiked ? "text-rose-500" : "text-muted-foreground hover:text-rose-500"}`}
                    >
                      <Heart 
                        className={`w-[15px] h-[15px] transition-all ${comment.isLiked ? "fill-current" : ""}`} 
                        strokeWidth={comment.isLiked ? 0 : 1.75} 
                      />
                      {comment.likesCount > 0 && (
                        <span className="text-[12px] font-semibold">{comment.likesCount}</span>
                      )}
                      {comment.likesCount === 0 && (
                        <span className="text-[11px] font-medium">Like</span>
                      )}
                    </button>
                    {user?.uid === comment.userId.firebaseId && (
                      <button
                        onClick={() => handleDelete(comment._id)}
                        className="flex items-center gap-1 text-muted-foreground hover:text-rose-500 transition-colors press-scale"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="text-[11px] pt-1.5 font-medium">Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {!loading && comments.length === 0 && (
            <div className="py-14 text-center px-6">
              <p className="text-muted-foreground text-[14px]">No reflections yet. Be the first to share one.</p>
            </div>
          )}
        </div>
      )}

      {/* Sticky composer at bottom */}
      {user ? (
        <div className="sticky bottom-0 border-t border-border glass-strong px-4 py-3 pb-safe">
          <form onSubmit={handleSubmit} className="flex items-end gap-3">
            {user.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoURL} alt="Me" className="w-8 h-8 rounded-full object-cover flex-shrink-0 self-end mb-1" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 self-end mb-1">
                <UserIcon className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 frosted-input flex items-center gap-2 px-3 py-2.5 min-h-[42px]">
              <textarea
                ref={inputRef}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a reflection…"
                rows={1}
                maxLength={200}
                className="flex-1 bg-transparent border-none outline-none resize-none text-[14px] placeholder:text-muted-foreground leading-snug max-h-24"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e as unknown as React.FormEvent);
                  }
                }}
              />
              <button
                type="submit"
                disabled={!newComment.trim() || submitting}
                className="flex-shrink-0 p-1.5 rounded-full bg-brand-green text-white disabled:opacity-30 hover:bg-[#00a855] transition-colors press-scale"
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="sticky bottom-0 border-t border-border glass-strong px-4 py-3 pb-safe text-center">
          <p className="text-[13px] text-muted-foreground">
            <span className="text-brand-green font-semibold cursor-pointer hover:underline">Sign in</span> to add a reflection.
          </p>
        </div>
      )}
    </div>
  );
};

export default CommentSection;
