"use client";

import React, { useState } from "react";
import { MessageCircle, Heart, Bookmark, Eye } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { useRouter } from "next/navigation";

interface InteractionBarProps {
  postId: string;
  initialLikes: number;
  initialViews: number;
  initialComments: number;
  initialIsLiked: boolean;
  initialIsSaved: boolean;
  showViews?: boolean;
  children?: React.ReactNode;
}

const fmt = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
};

export default function InteractionBar({
  postId,
  initialLikes,
  initialViews,
  initialComments,
  initialIsLiked,
  initialIsSaved,
  showViews = true,
  children,
}: InteractionBarProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likes, setLikes] = useState(initialLikes);
  const [isSaved, setIsSaved] = useState(initialIsSaved);
  const [justLiked, setJustLiked] = useState(false);

  // Sync state if initial props change (e.g. after async fetch in Detail Page)
  React.useEffect(() => {
    setIsLiked(initialIsLiked);
    setLikes(initialLikes);
    setIsSaved(initialIsSaved);
  }, [initialIsLiked, initialLikes, initialIsSaved, initialComments]);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      showToast("Sign in to like this thought", "warning");
      return;
    }

    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikes((p) => (newIsLiked ? p + 1 : p - 1));

    if (newIsLiked) {
      setJustLiked(true);
      setTimeout(() => setJustLiked(false), 600);
    }

    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // Revert on error
      setIsLiked(!newIsLiked);
      setLikes((p) => (newIsLiked ? p - 1 : p + 1));
      showToast("Failed to update like", "error");
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      showToast("Sign in to save this thought", "warning");
      return;
    }

    const newIsSaved = !isSaved;
    setIsSaved(newIsSaved);

    try {
      const res = await fetch("/api/saves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid, postId }),
      });
      if (res.ok) {
        showToast(newIsSaved ? "Saved to library" : "Removed from library", "success");
      } else {
        throw new Error();
      }
    } catch {
      setIsSaved(!newIsSaved);
      showToast("Failed to update save", "error");
    }
  };

  const handleComment = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/post/${postId}`);
  };

  return (
    <div className="flex items-center justify-between w-full text-muted-foreground">
      {/* Comments */}
      <button
        onClick={handleComment}
        className="flex items-center gap-1.5 group/btn transition-colors hover:text-blue-500 outline-none"
      >
        <div className="p-2 rounded-full group-hover/btn:bg-blue-500/10 transition-colors">
          <MessageCircle className="w-[18px] h-[18px]" strokeWidth={1.75} />
        </div>
        {initialComments > 0 && (
          <span className="text-[12px] font-semibold">{fmt(initialComments)}</span>
        )}
      </button>

      {/* Views */}
      {showViews && (
        <div className="flex items-center gap-1.5 text-muted-foreground/60">
          <div className="p-2">
            <Eye className="w-[18px] h-[18px]" strokeWidth={1.75} />
          </div>
          <span className="text-[12px] font-medium">{fmt(initialViews)}</span>
        </div>
      )}

      {/* Likes */}
      <button
        onClick={handleLike}
        className={`flex items-center gap-1.5 group/btn transition-colors outline-none ${
          isLiked ? "text-rose-500" : "hover:text-rose-500"
        }`}
      >
        <div
          className={`p-2 rounded-full transition-colors ${
            isLiked ? "" : "group-hover/btn:bg-rose-500/10"
          }`}
        >
          <Heart
            className={`w-[18px] h-[18px] transition-all ${
              isLiked ? "fill-current" : ""
            } ${justLiked ? "animate-heart" : ""}`}
            strokeWidth={isLiked ? 0 : 1.75}
          />
        </div>
        {likes > 0 && (
          <span className={`text-[12px] font-semibold ${isLiked ? "text-rose-500" : ""}`}>
            {fmt(likes)}
          </span>
        )}
      </button>

      {/* Saves */}
      <button
        onClick={handleSave}
        className={`flex items-center group/btn transition-colors outline-none ${
          isSaved ? "text-brand-green" : "hover:text-brand-green"
        }`}
      >
        <div
          className={`p-2 rounded-full transition-colors ${
            isSaved ? "" : "group-hover/btn:bg-brand-green/10"
          }`}
        >
          <Bookmark
            className={`w-[18px] h-[18px] transition-all ${isSaved ? "fill-current" : ""}`}
            strokeWidth={1.75}
          />
        </div>
      </button>
      {children}
    </div>
  );
}
