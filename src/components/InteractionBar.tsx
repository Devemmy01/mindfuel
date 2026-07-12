"use client";

import React, { useState } from "react";
import { MessageCircle, Heart, Bookmark, Eye, Repeat2, Quote } from "lucide-react";
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
  initialIsReposted?: boolean;
  initialReposts?: number;
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
  initialIsReposted = false,
  initialReposts = 0,
  showViews = true,
  children,
}: InteractionBarProps) {
  const { user, openSignInModal } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likes, setLikes] = useState(initialLikes);
  const [isSaved, setIsSaved] = useState(initialIsSaved);
  const [isReposted, setIsReposted] = useState(initialIsReposted);
  const [reposts, setReposts] = useState(initialReposts);
  const [justLiked, setJustLiked] = useState(false);
  const [justReposted, setJustReposted] = useState(false);
  const [showRepostMenu, setShowRepostMenu] = useState(false);

  React.useEffect(() => {
    setIsLiked(initialIsLiked);
    setLikes(initialLikes);
    setIsSaved(initialIsSaved);
    setIsReposted(initialIsReposted);
    setReposts(initialReposts);
  }, [initialIsLiked, initialLikes, initialIsSaved, initialIsReposted, initialReposts]);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) { openSignInModal(); return; }
    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikes((p) => (newIsLiked ? p + 1 : p - 1));
    if (newIsLiked) { setJustLiked(true); setTimeout(() => setJustLiked(false), 600); }
    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setIsLiked(!newIsLiked);
      setLikes((p) => (newIsLiked ? p - 1 : p + 1));
      showToast("Failed to update like", "error");
    }
  };

  const handleRepostToggle = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) { openSignInModal(); return; }
    setShowRepostMenu(false);
    const newIsReposted = !isReposted;
    setIsReposted(newIsReposted);
    setReposts((p) => (newIsReposted ? p + 1 : Math.max(0, p - 1)));
    if (newIsReposted) { setJustReposted(true); setTimeout(() => setJustReposted(false), 600); }
    try {
      const res = await fetch(`/api/posts/${postId}/repost`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      });
      if (!res.ok) throw new Error();
      if (newIsReposted) showToast("Reposted!", "success");
    } catch {
      setIsReposted(!newIsReposted);
      setReposts((p) => (newIsReposted ? p - 1 : p + 1));
      showToast("Failed to repost", "error");
    }
  };

  const handleQuote = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setShowRepostMenu(false);
    router.push(`/create?quoteId=${postId}`);
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) { openSignInModal(); return; }
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
      } else throw new Error();
    } catch {
      setIsSaved(!newIsSaved);
      showToast("Failed to update save", "error");
    }
  };

  const handleComment = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    router.push(`/post/${postId}`);
  };

  return (
    <div className="flex items-center justify-between w-full text-muted-foreground">
      {/* Comments */}
      <button
        onClick={handleComment}
        className="flex items-center gap-1 sm:gap-1.5 group/btn transition-colors hover:text-green-500/90 outline-none"
        aria-label="Comments"
      >
        <div className="p-1.5 sm:p-2 rounded-full group-hover/btn:bg-green-500/10 transition-colors">
          <MessageCircle className="w-[16px] h-[16px] sm:w-[18px] sm:h-[18px]" strokeWidth={1.75} />
        </div>
        {initialComments > 0 && <span className="text-[12px] font-semibold">{fmt(initialComments)}</span>}
      </button>

      {/* Repost */}
      <div className="relative">
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowRepostMenu(!showRepostMenu); }}
          aria-label="Repost options"
          className={`flex items-center group/btn transition-colors rounded-full outline-none ${
            isReposted ? "text-green-500/90" : "hover:text-green-500/90"
          }`}
        >
          <div className={`p-1.5 sm:p-2 rounded-full transition-colors ${isReposted ? "" : "group-hover/btn:bg-green-500/10"}`}>
            <Repeat2
              className={`w-[16px] h-[16px] sm:w-[18px] sm:h-[18px] transition-all ${justReposted ? "scale-125" : ""}`}
              strokeWidth={1.75}
            />
          </div>
          {reposts > 0 && <span className={`text-[12px] font-semibold ${isReposted ? "text-brand-green" : ""}`}>{fmt(reposts)}</span>}
        </button>

        {showRepostMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowRepostMenu(false)} />
            <div className="popover-solid absolute bottom-full left-0 mb-2 w-40 border border-border rounded-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-bottom-left">
              <button
                onClick={handleRepostToggle}
                className="w-full flex items-center gap-3 px-4 py-3 text-[13px] font-bold hover:bg-secondary/60 transition-colors"
              >
                <Repeat2 className="w-4 h-4" />
                {isReposted ? "Undo Repost" : "Repost"}
              </button>
              <button
                onClick={handleQuote}
                className="w-full flex items-center gap-3 px-4 py-3 text-[13px] font-bold hover:bg-secondary/60 transition-colors border-t border-border/50"
              >
                <Quote className="w-4 h-4" />
                Quote
              </button>
            </div>
          </>
        )}
      </div>

      {/* Likes */}
      <button
        onClick={handleLike}
        aria-label="Like"
        className={`flex items-center group/btn transition-colors outline-none ${isLiked ? "text-rose-500" : "hover:text-rose-500"}`}
      >
        <div className={`p-1.5 sm:p-2 rounded-full transition-colors ${isLiked ? "" : "group-hover/btn:bg-rose-500/10"}`}>
          <Heart
            className={`w-[16px] h-[16px] sm:w-[18px] sm:h-[18px] transition-all ${isLiked ? "fill-current" : ""} ${justLiked ? "animate-heart" : ""}`}
            strokeWidth={isLiked ? 0 : 1.75}
          />
        </div>
        {likes > 0 && <span className={`text-[12px] font-semibold ${isLiked ? "text-rose-500" : ""}`}>{fmt(likes)}</span>}
      </button>

      {/* Views */}
      {showViews && (
        <div className="flex items-center text-muted-foreground/60">
          <div className="p-1.5 sm:p-2">
            <Eye className="w-[16px] h-[16px] sm:w-[18px] sm:h-[18px]" strokeWidth={1.75} />
          </div>
          <span className="text-[12px] font-medium">{fmt(initialViews)}</span>
        </div>
      )}

      {/* Saves and Share (Grouped together on the right) */}
      <div className="flex items-center">
        <button
          onClick={handleSave}
          aria-label="Save"
          className={`flex items-center group/btn transition-colors outline-none ${isSaved ? "text-brand-green" : "hover:text-brand-green"}`}
        >
          <div className={`p-1.5 sm:p-2 rounded-full transition-colors ${isSaved ? "" : "group-hover/btn:bg-brand-green/10"}`}>
            <Bookmark
              className={`w-[16px] h-[16px] sm:w-[18px] sm:h-[18px] transition-all ${isSaved ? "fill-current" : ""}`}
              strokeWidth={1.75}
            />
          </div>
        </button>

        {children}
      </div>
    </div>
  );
}
