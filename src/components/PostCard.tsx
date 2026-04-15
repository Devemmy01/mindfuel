/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import {
  MessageCircle, Heart, Bookmark, Share2,
  CheckCircle2, MoreHorizontal, Link as LinkIcon, Twitter, Eye, Trash2, Edit, X, Sparkles, Loader2, Smile
} from "lucide-react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { PostType } from "@/types";
import { toPng } from "html-to-image";
import { Download } from "lucide-react";
import { backgroundOptions } from "@/lib/backgrounds";
import { getFontById, fontOptions } from "@/lib/fonts";
import { CardWatermark } from "@/components/CardCreator";

interface PostCardProps {
  post: PostType;
}

const fmt = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return n === 0 ? "" : String(n);
};

// backgroundOptions imported from lib

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(post.likesCount);
  const [isSaved, setIsSaved] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(post.text);
  const [editBg, setEditBg] = useState(
    backgroundOptions.find(o => o.value === post.backgroundStyle.value) || backgroundOptions[0]
  );
  const [editFont, setEditFont] = useState(getFontById(post.fontFamily ?? "inter"));
  const [isUpdating, setIsUpdating] = useState(false);

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [privateNote, setPrivateNote] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  const [justLiked, setJustLiked] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const shareMenuRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const viewFetched = useRef(false);
  
  const editTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setShowShareMenu(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    if (showShareMenu || showMenu || showEmojiPicker) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showShareMenu, showMenu, showEmojiPicker]);

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

  useEffect(() => {
    if (!viewFetched.current) {
      viewFetched.current = true;
      fetch(`/api/posts/${post._id}/view`, { method: "POST" }).catch(() => {});
    }
  }, [post._id]);

  useEffect(() => {
    if (user) {
      fetch(`/api/posts/${post._id}/like?userId=${user.uid}`)
        .then((r) => r.json())
        .then((d) => setIsLiked(d.liked))
        .catch(() => {});
      fetch(`/api/saves?userId=${user.uid}`)
        .then((r) => r.json())
        .then((d) => {
          setIsSaved(!!d.saves?.some((s: { postId: { _id: string } }) => s.postId._id === post._id));
        })
        .catch(() => {});
    }
  }, [post._id, user]);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) return;

    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikes((p) => newIsLiked ? p + 1 : p - 1);

    if (newIsLiked) {
      setJustLiked(true);
      setTimeout(() => setJustLiked(false), 600);
    }

    try {
      const res = await fetch(`/api/posts/${post._id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      });
      if (res.ok) {
        showToast(newIsLiked ? "Reflection liked" : "Reflection unliked", "success");
      }
    } catch {
      setIsLiked(!newIsLiked);
      setLikes((p) => newIsLiked ? p - 1 : p + 1);
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) return;
    setIsSaved((p) => !p);
    try {
      const res = await fetch('/api/saves', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid, postId: post._id }),
      });
      if (res.ok) {
        showToast(!isSaved ? "Saved to library" : "Removed from library", "success");
      }
    } catch {}
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setShowShareMenu((p) => !p);
  };

  const copyLink = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/post/${post._id}`);
    showToast("Link copied to clipboard", "success");
    setShowShareMenu(false);
    setShowMenu(false);
  };

  const shareToX = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const url = `${window.location.origin}/post/${post._id}`;
    const text = encodeURIComponent(`Thought on MindFuel by ${post.userId.name}:`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`, '_blank');
    setShowShareMenu(false);
    setShowMenu(false);
  };

  const shareToWhatsApp = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const url = `${window.location.origin}/post/${post._id}`;
    const text = encodeURIComponent(`Thought on MindFuel by ${post.userId.name}:\n${url}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    setShowShareMenu(false);
    setShowMenu(false);
  };

  const downloadCard = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!cardRef.current) return;
    setIsDownloading(true);
    try {
      await new Promise((r) => setTimeout(r, 150));
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, quality: 1, pixelRatio: 3, skipFonts: true });
      const link = document.createElement("a");
      link.download = `mindfuel-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      showToast("Reflection downloaded as image", "success");
      setShowShareMenu(false);
      setShowMenu(false);
    } catch (err) {
      console.error("Download failed", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!user || user.uid !== post.userId.firebaseId) return;
    if (!confirm("Are you sure you want to delete this thought?")) return;

    try {
      const res = await fetch(`/api/posts/${post._id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || user.uid !== post.userId.firebaseId || !editText.trim() || isUpdating) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/posts/${post._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          text: editText,
          backgroundStyle: { 
            id: editBg.id,
            type: editBg.type, 
            value: editBg.value, 
            text: editBg.text 
          },
          fontFamily: editFont.id,

        }),
      });
      if (res.ok) {
        setIsEditing(false);
        window.location.reload();
      }
    } catch (err) {
      console.error("Update failed", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveNote = async () => {
    if (!user || isSavingNote) return;
    setIsSavingNote(true);
    try {
      const res = await fetch(`/api/saves/${post._id}/note`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid, note: privateNote }),
      });
      if (res.ok) {
        setIsSaved(true);
        setIsNoteModalOpen(false);
        showToast("Private note saved", "success");
      }
    } catch (err) {
      console.error("Failed to save note", err);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleReport = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (confirm("Report this reflection? It will be hidden from your feed and the admin will be notified.")) {
      setIsHidden(true);
      setShowMenu(false);
      
      try {
        await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId: post._id, userId: user?.uid }),
        });
        showToast("Post reported to admin", "warning");
      } catch (err) {
        console.error("Report failed", err);
      }
    }
  };

  if (isHidden) return null;

  const bgStyle =
    post.backgroundStyle.type === "gradient"
      ? { backgroundImage: post.backgroundStyle.value }
      : { backgroundColor: post.backgroundStyle.value };

  const isLight =
    post.backgroundStyle.value === "#ffffff" ||
    post.backgroundStyle.value === "#F5F5DC" ||
    post.backgroundStyle.value.toLowerCase() === "#f5f5dc";
  const textColor = isLight ? "#171717" : "#ffffff";

  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: false })
    .replace("about ", "")
    .replace("less than a minute", "now");

  return (
    <>
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.995 }}
      onClick={() => router.push(`/post/${post._id}`)}
      className="flex flex-row px-4 py-4 border-b border-border hover:bg-secondary/20 transition-colors cursor-pointer group outline-none"
    >
      <div className="mr-3 flex-shrink-0 pt-0.5">
        <Link href={`/profile/${post.userId.firebaseId}`} onClick={(e) => e.stopPropagation()} className="block outline-none press-scale">
          {post.userId.image && !post.userId.image.startsWith("#") ? (
            <img
              src={post.userId.image}
              alt={post.userId.name}
              className="w-10 h-10 rounded-full bg-secondary object-cover ring-2 ring-transparent group-hover:ring-brand-green/20 transition-all"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-[13px] font-bold text-white"
              style={{
                backgroundColor: "#0a0a0a",
              }}
            >
              {post.userId.name?.[0]?.toUpperCase()}
            </div>
          )}
        </Link>
      </div>

      <div className="flex flex-col w-full min-w-0">
        <div className="flex items-center justify-between w-full mb-1">
          <div className="flex gap-4 min-w-0">
            <div className="flex flex-col">
              <Link 
              href={`/profile/${post.userId.firebaseId}`}
              onClick={(e) => e.stopPropagation()}
              className="font-bold text-[14px] text-foreground hover:underline whitespace-nowrap max-w-[120px] sm:max-w-[160px]"
            >
              {post.userId.name}
            </Link>
            {post.isSponsored && (
              <CheckCircle2 className="w-[14px] h-[14px] text-brand-green flex-shrink-0" fill="currentColor" strokeWidth={0} />
            )} 
            <Link 
              href={`/profile/${post.userId.firebaseId}`}
              onClick={(e) => e.stopPropagation()}
              className="text-muted-foreground text-[13px] -mt-4 sm:mt-0 max-w-[80px] hover:text-foreground transition-colors"
            >
              @{post.userId.name.replace(/\s+/g, "").toLowerCase()}
            </Link>
            </div>
            <span className="text-muted-foreground text-[13px] flex-shrink-0">·</span>
            <span className="text-muted-foreground text-[13px] flex-shrink-0 whitespace-nowrap">
              {timeAgo}
            </span>
          </div>
          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMenu(!showMenu); }}
              className="p-1.5 -mr-1.5 rounded-full text-muted-foreground hover:text-brand-green hover:bg-brand-green/10 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-popover popover-solid border border-border rounded-xl shadow-card py-1 z-50 animate-scale-in flex flex-col">
                {user?.uid === post.userId.firebaseId ? (
                  <>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsEditing(true); setShowMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-[13px] font-medium text-foreground hover:bg-secondary/60 transition-colors"
                    >
                      <Edit className="w-4 h-4" /> Edit
                    </button>
                    <button
                      onClick={handleDelete}
                      className="w-full flex items-center gap-3 px-4 py-2 text-[13px] font-medium text-rose-500 hover:bg-rose-500/5 transition-colors border-t border-border/50"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsNoteModalOpen(true); setShowMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-[13px] font-medium text-foreground hover:bg-secondary/60 transition-colors"
                    >
                      <Edit className="w-4 h-4" /> Private Note
                    </button>
                    <button
                      onClick={copyLink}
                      className="w-full flex items-center gap-3 px-4 py-2 text-[13px] font-medium text-foreground hover:bg-secondary/60 transition-colors"
                    >
                      <LinkIcon className="w-4 h-4" /> Copy Link
                    </button>
                    <button
                      onClick={downloadCard}
                      className="w-full flex items-center gap-3 px-4 py-2 text-[13px] font-medium text-foreground hover:bg-secondary/60 transition-colors border-b border-border/50"
                    >
                      <Download className="w-4 h-4" /> Download
                    </button>
                    <button
                      onClick={handleReport}
                      className="w-full flex items-center gap-3 px-4 py-2 text-[13px] font-medium text-rose-500 hover:bg-rose-500/5 transition-colors"
                    >
                      <Eye className="w-4 h-4" /> Report
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {post.isSponsored && (
          <span className="brand-pill mb-2 self-start">Promoted</span>
        )}

        <div
          ref={cardRef}
          className={`thought-card relative ${isDownloading ? "" : "rounded-2xl"} overflow-hidden border border-black/5 dark:border-white/5 mb-2.5`}
          style={{ ...bgStyle, color: textColor }}
        >
          {/* Decorative quote */}
          <span className="thought-card-quote" style={{ color: textColor }}>&ldquo;</span>
          {/* Texture overlays */}
          <div className={`absolute inset-0 ${isDownloading ? "" : "rounded-2xl"} ring-1 ring-inset ring-white/10 mix-blend-overlay pointer-events-none`} />
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-20 pointer-events-none" />
          {/* Inner glow vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.12)_0%,transparent_60%)] pointer-events-none" />
          <div className="absolute inset-0 bg-white/0 group-hover:bg-white/[0.03] transition-colors pointer-events-none" />
          <p
            className="relative z-10 px-4 md:px-5 pt-8 pb-14 text-[16px] sm:text-[18px] font-semibold leading-[1.5] tracking-tight whitespace-pre-wrap break-words drop-shadow-sm"
            style={{ fontFamily: getFontById(post.fontFamily ?? "inter").family }}
          >
            {post.text}
          </p>
          <CardWatermark color={textColor} isVisible={isDownloading} />
        </div>

        <div className="flex items-center justify-between text-muted-foreground pr-2">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/post/${post._id}`); }}
            className="flex items-center gap-1.5 group/btn transition-colors hover:text-blue-500 outline-none"
          >
            <div className="p-1.5 rounded-full group-hover/btn:bg-blue-500/10 transition-colors">
              <MessageCircle className="w-[18px] h-[18px]" strokeWidth={1.75} />
            </div>
            {(post.commentsCount ?? 0) > 0 && (
              <span className="text-[12px] font-semibold">{fmt(post.commentsCount || 0)}</span>
            )}
          </button>

          <div className="flex items-center gap-1.5 text-muted-foreground/60">
            <div className="p-1.5">
              <Eye className="w-[18px] h-[18px]" strokeWidth={1.75} />
            </div>
            <span className="text-[12px] font-medium">{fmt(post.views)}</span>
          </div>

          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 group/btn transition-colors outline-none ${isLiked ? "text-rose-500" : "hover:text-rose-500"}`}
          >
            <div className={`p-1.5 rounded-full transition-colors ${isLiked ? "" : "group-hover/btn:bg-rose-500/10"}`}>
              <Heart
                className={`w-[18px] h-[18px] transition-all ${isLiked ? "fill-current" : ""} ${justLiked ? "animate-heart" : ""}`}
                strokeWidth={isLiked ? 0 : 1.75}
              />
            </div>
            {likes > 0 && (
              <span className={`text-[12px] font-semibold ${isLiked ? "text-rose-500" : ""}`}>{fmt(likes)}</span>
            )}
          </button>

          <div className="flex items-center relative" ref={shareMenuRef}>
            <button
              onClick={handleSave}
              className={`flex items-center group/btn transition-colors outline-none ${isSaved ? "text-brand-green" : "hover:text-brand-green"}`}
            >
              <div className={`p-1.5 rounded-full transition-colors ${isSaved ? "" : "group-hover/btn:bg-brand-green/10"}`}>
                <Bookmark
                  className={`w-[18px] h-[18px] transition-all ${isSaved ? "fill-current" : ""}`}
                  strokeWidth={1.75}
                />
              </div>
            </button>
            <button
              onClick={handleShareClick}
              className="flex items-center group/btn transition-colors hover:text-blue-500 outline-none"
            >
              <div className="p-1.5 rounded-full group-hover/btn:bg-blue-500/10 transition-colors">
                <Share2 className={`w-[18px] h-[18px] ${showShareMenu ? "text-blue-500" : ""}`} strokeWidth={1.75} />
              </div>
            </button>

            {showShareMenu && (
              <div className="absolute right-0 bottom-full mb-2 w-48 bg-popover popover-solid border border-border rounded-xl shadow-card py-1 z-50 animate-scale-in flex flex-col">
                <button onClick={copyLink} className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-foreground hover:bg-secondary/60 transition-colors">
                  <LinkIcon className="w-4 h-4 text-muted-foreground" /> Copy Link
                </button>
                <button onClick={shareToX} className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-foreground hover:bg-secondary/60 transition-colors">
                  <Twitter className="w-4 h-4 text-[#1DA1F2]" /> Share to X
                </button>
                <button onClick={shareToWhatsApp} className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-foreground hover:bg-secondary/60 transition-colors border-b border-border/50">
                  <MessageCircle className="w-4 h-4 text-[#25D366]" /> Share to WhatsApp
                </button>
                <button onClick={downloadCard} className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-foreground hover:bg-secondary/60 transition-colors">
                  <Download className="w-4 h-4 text-brand-green" /> Download Image
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.article>

      <AnimatePresence>
        {isEditing && (
          <motion.div 
            key="edit-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm" 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsEditing(false); }}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card border border-border w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-secondary/20">
                <h3 className="text-[17px] font-bold tracking-tight">Edit Thought</h3>
                <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-secondary/60 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                {/* Live Preview Area */}
                <div 
                  className="relative w-full rounded-2xl shadow-card overflow-hidden border border-black/5 dark:border-white/5 min-h-[160px] mb-6 transition-all duration-300"
                  style={{ background: editBg.type === "gradient" ? editBg.value : editBg.value, color: editBg.text }}
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
                    autoFocus
                  />
                  <CardWatermark color={editBg.text} />
                </div>
                
                {/* Tools Toolbar */}
                <div className="flex flex-col gap-4 mb-6">
                  <div className="flex items-center justify-between gap-3">
                    {/* Emoji / Font */}
                    <div className="flex items-center gap-3 relative" ref={emojiPickerRef}>
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker((p) => !p)}
                        className={`p-2 rounded-xl transition-colors shrink-0 ${showEmojiPicker ? "text-brand-green bg-brand-green/10" : "text-muted-foreground hover:bg-secondary"}`}
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
                            className="absolute bottom-full left-0 mb-2 z-50 shadow-2xl rounded-2xl overflow-hidden border border-border/50"
                          >
                            <EmojiPicker onEmojiClick={onEmojiClick} theme={Theme.AUTO} width={280} height={320} />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mask-gradient-right pb-1">
                        {fontOptions.map((font) => (
                          <button
                            key={font.id}
                            onClick={() => setEditFont(font)}
                            className={`shrink-0 px-3 py-1.5 rounded-xl text-[13px] font-semibold transition-all ${
                              editFont.id === font.id
                                ? "bg-brand-green text-white"
                                : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
                            }`}
                            style={{ fontFamily: font.family }}
                          >
                            {font.label}
                          </button>
                        ))}
                        <div className="w-6 shrink-0" />
                      </div>
                    </div>
                  </div>

                  {/* Themes / Backgrounds */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground shrink-0 pl-1">Theme</span>
                    <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-2 mask-gradient-right">
                      {backgroundOptions.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => setEditBg(option)}
                          className={`w-10 h-10 rounded-full transition-all flex-shrink-0 ${editBg.id === option.id ? "scale-110 ring-2 ring-brand-green ring-offset-2 ring-offset-background" : "opacity-75 hover:opacity-100 hover:scale-105"}`}
                          style={{ background: option.value }}
                          title={option.name}
                        />
                      ))}
                      <div className="w-6 shrink-0" />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setIsEditing(false)} className="flex-[1] py-3.5 bg-secondary/60 text-foreground font-bold rounded-2xl hover:bg-secondary transition-all press-scale">Cancel</button>
                  <button onClick={handleUpdate} disabled={isUpdating || !editText.trim()} className="flex-[2] py-3.5 text-white font-bold rounded-2xl bg-[#00a855] hover:bg-[#00a855]/80 disabled:opacity-50 transition-all shadow-brand-sm press-scale flex items-center justify-center gap-2 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:translate-x-full duration-1000 -translate-x-full transition-transform" />
                    {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isNoteModalOpen && (
          <motion.div 
            key="note-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm" 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsNoteModalOpen(false); }}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card border border-border w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-brand-green/5">
                <h3 className="text-[17px] font-bold tracking-tight text-brand-green">Private Note</h3>
                <button onClick={() => setIsNoteModalOpen(false)} className="p-2 hover:bg-secondary/60 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <p className="text-[13px] text-muted-foreground mb-4">Reflect on this thought. This note is only visible to you and will save the reflection to your library.</p>
                <textarea 
                  value={privateNote}
                  onChange={(e) => setPrivateNote(e.target.value)}
                  placeholder="Your personal reflection..."
                  className="w-full bg-secondary/30 border border-border rounded-2xl resize-none focus:ring-1 focus:ring-brand-green outline-none p-4 text-[15px] mb-6"
                  rows={4}
                  autoFocus
                />
                <div className="flex gap-3">
                  <button onClick={() => setIsNoteModalOpen(false)} className="flex-1 py-3 bg-secondary/60 text-foreground font-bold rounded-2xl hover:bg-secondary transition-all press-scale">Cancel</button>
                  <button onClick={handleSaveNote} disabled={isSavingNote || !privateNote.trim()} className="flex-[2] py-3 bg-brand-green text-white font-bold rounded-2xl bg-[#00a855] hover:bg-[#00a855]/80 disabled:opacity-50 transition-all shadow-brand-sm press-scale flex items-center justify-center gap-2">
                    {isSavingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bookmark className="w-4 h-4" />}
                    Save Note
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PostCard;
