"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import {
  ArrowLeft,
  Share2,
  Bookmark,
  MessageCircle,
  Loader2,
  MoreHorizontal,
  Link as LinkIcon,
  Twitter,
  Trash2,
  Edit,
  X,
  Eye,
  Sparkles,
  Smile,
} from "lucide-react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import CommentSection from "@/components/CommentSection";
import { toPng } from "html-to-image";
import { Download } from "lucide-react";
import { PostType } from "@/types";
import { backgroundOptions } from "@/lib/backgrounds";
import { fontOptions, getFontById } from "@/lib/fonts";
import { CardWatermark } from "@/components/CardCreator";
import InteractionBar from "@/components/InteractionBar";
import { format } from "date-fns";

const fmt = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
};

const isColorLight = (hex: string) => {
  if (!hex || !hex.startsWith("#")) return true;
  const c = hex.substring(1);
  const rgb = parseInt(c, 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >>  8) & 0xff;
  const b = (rgb >>  0) & 0xff;
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luma > 160;
};

// backgroundOptions imported from lib

export default function PostDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [post, setPost] = useState<PostType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const shareMenuRef = React.useRef<HTMLDivElement>(null);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const cardRef = React.useRef<HTMLButtonElement>(null);
  const viewFetched = useRef(false);
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [editBg, setEditBg] = useState(backgroundOptions[0]);
  const [editFont, setEditFont] = useState(fontOptions[0]);
  // Card full-screen view
  const [isCardFullScreen, setIsCardFullScreen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  // Notes/Report state
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [privateNote, setPrivateNote] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const editTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    if (id && !viewFetched.current) {
      viewFetched.current = true;
      const trackView = async () => {
        try {
          const res = await fetch(`/api/posts/${id}/view`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user?.uid }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.views !== undefined) {
              setPost(prev => prev ? { ...prev, views: data.views } : null);
            }
          }
        } catch {
          // Ignore errors
        }
      };
      
      if ("requestIdleCallback" in window) {
        requestIdleCallback(trackView);
      } else {
        setTimeout(trackView, 1000);
      }
    }
  }, [id, user?.uid]);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setShowShareMenu(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/posts/${id}`);
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        setPost(data.post);
        setLikesCount(data.post?.likesCount || 0);
        setCommentsCount(data.post?.commentsCount || 0);
        
        // Init edit state
        setEditText(data.post?.text || "");
        const postBgVal = data.post?.backgroundStyle.value;
        const foundBg = backgroundOptions.find(o => o.value === postBgVal);
        setEditBg(
          foundBg || {
            id: "custom",
            name: "Custom Color",
            type: "color",
            value: postBgVal,
            text: isColorLight(postBgVal) ? "#171717" : "#ffffff"
          }
        );
        setEditFont(getFontById(data.post?.fontFamily ?? "inter"));

        // Dynamic SEO
        if (data.post) {
          const truncatedText = data.post.text.slice(0, 80) + (data.post.text.length > 80 ? "…" : "");
          document.title = `${data.post.userId.name}: "${truncatedText}" | MindFuel`;
          
          // Update meta description
          let metaDesc = document.querySelector('meta[name="description"]');
          if (!metaDesc) {
            metaDesc = document.createElement("meta");
            metaDesc.setAttribute("name", "description");
            document.head.appendChild(metaDesc);
          }
          metaDesc.setAttribute("content", `${data.post.userId.name} shared a thought on MindFuel: "${data.post.text.slice(0, 150)}"`);

          // JSON-LD Article schema
          const existingLd = document.querySelector('script[data-post-ld]');
          if (existingLd) existingLd.remove();
          const ldScript = document.createElement("script");
          ldScript.type = "application/ld+json";
          ldScript.setAttribute("data-post-ld", "true");
          ldScript.textContent = JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: truncatedText,
            author: { "@type": "Person", name: data.post.userId.name },
            datePublished: data.post.createdAt,
            interactionStatistic: [
              { "@type": "InteractionCounter", interactionType: "https://schema.org/LikeAction", userInteractionCount: data.post.likesCount },
              { "@type": "InteractionCounter", interactionType: "https://schema.org/ViewAction", userInteractionCount: data.post.views },
            ],
            publisher: { "@type": "Organization", name: "MindFuel", url: window.location.origin },
          });
          document.head.appendChild(ldScript);
        }
      } catch {
        // handled in render
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (user && post) {
      fetch(`/api/posts/${post._id}/like?userId=${user.uid}`)
        .then((r) => r.json())
        .then((d) => setIsLiked(d.liked))
        .catch(() => {});
      fetch(`/api/saves?userId=${user.uid}`)
        .then((r) => r.json())
        .then((d) =>
          setIsSaved(
            !!d.saves?.some(
              (s: { postId: { _id: string } }) => s.postId._id === post._id,
            ),
          ),
        )
        .catch(() => {});
    }
  }, [post, user]);

  const handleDelete = async () => {
    if (!user || !post || user.uid !== post.userId.firebaseId) return;
    if (!confirm("Delete this thought forever?")) return;

    try {
      const res = await fetch(`/api/posts/${post._id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      });
      if (res.ok) {
        router.push("/");
      }
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const handleUpdate = async () => {
    if (!user || !post || user.uid !== post.userId.firebaseId || !editText.trim() || isUpdating) return;
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
    if (!user || !post || isSavingNote) return;
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

  const handleReport = async () => {
    if (!post) return;
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
      router.push("/");
    }
  };

  const handleShareClick = () => {
    setShowShareMenu((p) => !p);
  };

  const copyLink = () => {
    if (!post) return;
    navigator.clipboard.writeText(`${window.location.origin}/post/${post._id}`);
    showToast("Link copied to clipboard", "success");
    setShowShareMenu(false);
  };

  const shareToX = () => {
    if (!post) return;
    const url = `${window.location.origin}/post/${post._id}`;
    const text = encodeURIComponent(`Thought on MindFuel by ${post.userId.name}:`);
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`,
      "_blank",
    );
    setShowShareMenu(false);
  };

  const shareToWhatsApp = () => {
    if (!post) return;
    const url = `${window.location.origin}/post/${post._id}`;
    const text = encodeURIComponent(`Thought on MindFuel by ${post.userId.name}:\n${url}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
    setShowShareMenu(false);
  };

  const downloadCard = async () => {
    if (!cardRef.current || !post) return;
    setIsDownloading(true);
    try {
      await new Promise((r) => setTimeout(r, 150));
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, quality: 1, pixelRatio: 3, skipFonts: true });
      const link = document.createElement("a");
      link.download = `mindfuel-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      showToast("Downloading the card...");
      setShowShareMenu(false);
      setShowMenu(false);
    } catch (err) {
      console.error("Download failed", err);
    } finally {
      setIsDownloading(false);
    }
  };

  if (isHidden) return null;

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-7 h-7 animate-spin text-brand-green" />
      </div>
    );

  if (!post)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center space-y-4 px-6">
        <h2 className="text-xl font-bold">Post not found</h2>
        <button
          onClick={() => router.back()}
          className="text-brand-green font-semibold"
        >
          Go back
        </button>
      </div>
    );

  const bgStyle =
    post.backgroundStyle.type === "gradient"
      ? { backgroundImage: post.backgroundStyle.value }
      : { backgroundColor: post.backgroundStyle.value };
  const isLight =
    post.backgroundStyle.value === "#ffffff" ||
    post.backgroundStyle.value.toLowerCase() === "#f5f5dc";
  const textColor = isLight ? "#171717" : "#ffffff";

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

  return (
    <div className="flex flex-col w-full min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-strong border-b border-border/60 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-1 rounded-xl hover:bg-secondary/60 transition-colors press-scale"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-[17px] tracking-tight leading-tight">
              Thought
            </h1>
            <p className="text-[12px] text-muted-foreground">
              by {post.userId.name}
            </p>
          </div>
        </div>
        <div className="relative" ref={menuRef}>
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-xl hover:bg-secondary/60 transition-colors text-muted-foreground"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-popover popover-solid border border-border rounded-xl shadow-card py-1 z-50 animate-scale-in flex flex-col">
              {user?.uid === post.userId.firebaseId ? (
                <>
                  <button
                    onClick={() => { setIsEditing(true); setShowMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-foreground hover:bg-secondary/60 transition-colors"
                  >
                    <Edit className="w-4 h-4" /> Edit Thought
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-rose-500 hover:bg-rose-500/5 transition-colors border-t border-border/50"
                  >
                    <Trash2 className="w-4 h-4" /> Delete Thought
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => { setIsNoteModalOpen(true); setShowMenu(false); }}
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
      </header>

      {/* Post content */}
      <article className="flex flex-col border-b border-border">
        {/* Author row */}
        <div className="flex items-center justify-between px-4 pb-2 mt-3">
          <div className="flex  gap-3">
            <Link href={`/profile/${post.userId.firebaseId}`} className="block outline-none press-scale shrink-0">
              {post.userId.image ? (
                <Image
                  src={post.userId.image}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-transparent hover:ring-brand-green/20 transition-all"
                  alt=""
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-muted-foreground text-[15px]">
                  {post.userId.name?.[0]?.toUpperCase()}
                </div>
              )}
            </Link>
            <div className="flex flex-col gap-3 min-w-0">
              <Link href={`/profile/${post.userId.firebaseId}`} className="font-bold text-[15px] hover:underline truncate">
                {post.userId.name}
              </Link>
              <Link href={`/profile/${post.userId.firebaseId}`} className="text-[13px] -mt-4 text-muted-foreground truncate hover:text-foreground transition-colors">
                @{post.userId.username || post.userId.name.replace(/\s+/g, "").toLowerCase()}
              </Link>
            </div>
          </div>
        </div>

        {/* Thought card */}
        <div className="px-4 py-2">
          <button
            onClick={() => setIsCardFullScreen(true)}
            ref={cardRef}
            className={`thought-card relative w-full ${isDownloading ? "!rounded-none !border-none min-w-[380px] aspect-[4/5] flex flex-col justify-center" : "rounded-2xl"} overflow-hidden border border-black/5 dark:border-white/5 text-left transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-green/50`}
            style={{ ...bgStyle, color: textColor }}
          >
            {/* Texture overlays */}
            <div className={`absolute inset-0 ${isDownloading ? "" : "rounded-2xl"} ring-1 ring-inset ring-white/10 mix-blend-overlay pointer-events-none`} />
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-20 pointer-events-none" />
            
            {/* Inner glow vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.12)_0%,transparent_60%)] pointer-events-none" />

            {/* Grouped content for centered alignment */}
            <div className={`relative z-10 w-full pt-10 ${isDownloading ? "flex flex-col items-start px-8 py-4" : ""}`}>
              {/* Decorative quote */}
              <span 
                className={isDownloading ? "relative mb-1 block text-[64px] font-black opacity-[0.08]" : "thought-card-quote -ml-1"} 
                style={{ color: textColor, fontFamily: "'Georgia', serif" }}
              >
                &ldquo;
              </span>

              <p
                className={`relative ${isDownloading ? "text-[22px] sm:text-[26px] px-0" : "px-6 md:px-8 pt-4 pb-16 text-[20px] sm:text-[24px]"} font-semibold leading-[1.45] tracking-tight whitespace-pre-wrap break-words drop-shadow-sm transition-all`}
                style={{ fontFamily: getFontById(post.fontFamily ?? "inter").family }}
              >
                {post.text}
              </p>
            </div>
            {/* Watermark */}
            <CardWatermark color={textColor} isVisible={isDownloading} />
          </button>
        </div>

        {/* Engagement counts moved into InteractionBar behavior, but we keep the visual divider for density */}
        <div className="px-4 py-3 border-b border-border flex items-center gap-2 text-[13px] text-muted-foreground">
          <span>
            {format(new Date(post.createdAt), "h:mm a · MMM d, yyyy")}
          </span>
          <span>·</span>
          <span className="font-bold text-foreground">
            {fmt(post.views || 0)}
          </span>
          <span>Views</span>
          <span>·</span>
          <span className="font-bold text-foreground">
            {fmt(likesCount)}
          </span>
          <span>Likes</span>
        </div>

        {/* Action bar */}
        <div className="flex items-center py-1 border-b border-border px-4">
          <InteractionBar 
            postId={post._id}
            initialLikes={post.likesCount}
            initialViews={post.views}
            initialComments={commentsCount}
            initialIsLiked={isLiked}
            initialIsSaved={isSaved}
            showViews={false} // Already shown above in detail view
          />
          
          <div
            className="flex justify-center relative"
            ref={shareMenuRef}
          >
            <button
              onClick={handleShareClick}
              className={`flex justify-center p-2 w-full transition-colors rounded-xl group ${
                showShareMenu
                  ? "text-blue-500 bg-blue-500/5"
                  : "text-muted-foreground hover:text-blue-500 hover:bg-blue-500/5"
              }`}
            >
              <Share2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>

            {/* Share Dropdown */}
            {showShareMenu && (
              <div className="absolute right-0 bottom-full mb-2 w-48 bg-popover popover-solid border border-border rounded-xl shadow-card py-1 z-50 animate-scale-in flex flex-col">
                <button
                  onClick={copyLink}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-foreground hover:bg-secondary/60 transition-colors"
                >
                  <LinkIcon className="w-4 h-4 text-muted-foreground" /> Copy
                  Link
                </button>
                <button
                  onClick={shareToX}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-foreground hover:bg-secondary/60 transition-colors"
                >
                  <Twitter className="w-4 h-4 text-[#1DA1F2]" /> Share to X
                </button>
                <button
                  onClick={shareToWhatsApp}
                  className="calc-w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-foreground hover:bg-secondary/60 transition-colors border-b border-border/50"
                >
                  <MessageCircle className="w-4 h-4 text-[#25D366]" /> Share to
                  WhatsApp
                </button>
                <button
                  onClick={downloadCard}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-foreground hover:bg-secondary/60 transition-colors"
                >
                  <Download className="w-4 h-4 text-brand-green" /> Download
                  Image
                </button>
              </div>
            )}
          </div>
        </div>
      </article>

      {/* Comments */}
      <div className="flex-1 w-full pb-32">
        <CommentSection 
          postId={post._id} 
          onCommentAdded={() => setCommentsCount(prev => prev + 1)}
          onCommentDeleted={() => setCommentsCount(prev => prev - 1)}
        />
      </div>

  {/* Edit Modal */}
      <AnimatePresence>
        {isEditing && (
          <motion.div 
            key="edit-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm" 
            onClick={() => setIsEditing(false)}
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
                {/* Preview Card */}
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
                    maxLength={200}
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
                      {/* Custom Color Picker */}
                      <div className="relative flex-shrink-0 w-8 h-8 rounded-full overflow-hidden border border-border hover:scale-105 transition-all shadow-sm">
                        <input 
                          type="color" 
                          value={editBg.id === "custom" ? editBg.value : "#00bf63"} 
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditBg({
                              id: "custom",
                              name: "Custom Color",
                              type: "color",
                              value: val,
                              text: isColorLight(val) ? "#171717" : "#ffffff"
                            });
                          }}
                          className="absolute inset-[-10px] w-12 h-12 cursor-pointer opacity-0 z-10"
                          title="Pick a custom color"
                        />
                        {editBg.id === "custom" ? (
                          <div className="w-full h-full" style={{ backgroundColor: editBg.value }} />
                        ) : (
                          <div className="w-full h-full bg-[conic-gradient(red,yellow,lime,aqua,blue,magenta,red)] opacity-90" />
                        )}
                      </div>
            
                      <div className="w-px h-6 bg-border mx-1 flex-shrink-0" />

                      {backgroundOptions.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => setEditBg(option)}
                          className={`w-10 h-10 sm:w-8 sm:h-8 rounded-full transition-all flex-shrink-0 ${editBg.id === option.id && editBg.id !== "custom" ? "scale-110 ring-2 ring-brand-green ring-offset-2 ring-offset-background" : "opacity-75 hover:opacity-100 hover:scale-105"}`}
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

      {/* Full-screen Card Viewer */}
      <AnimatePresence>
        {isCardFullScreen && post && (
          <motion.div 
            key="card-fullscreen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
            onClick={() => setIsCardFullScreen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              className="relative w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setIsCardFullScreen(false)}
                className="absolute top-4 right-4 z-20 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors backdrop-blur"
              >
                <X className="w-5 h-5 text-white" />
              </button>

              {/* Card content */}
              <div
                className="w-full h-full flex flex-col justify-between p-6 sm:p-8"
                style={bgStyle}
              >
                <p
                  className="text-2xl sm:text-3xl md:text-4xl font-semibold leading-[1.45] tracking-tight whitespace-pre-wrap drop-shadow-md flex-1 flex items-center"
                  style={{ fontFamily: getFontById(post.fontFamily ?? "inter").family, color: textColor }}
                >
                  {post.text}
                </p>
                <CardWatermark color={textColor} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Note Modal */}
      <AnimatePresence>
        {isNoteModalOpen && (
          <motion.div 
            key="note-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm" 
            onClick={() => setIsNoteModalOpen(false)}
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
                <p className="text-[13px] text-muted-foreground mb-4">
                  Reflect on this thought. This note is only visible to you and will save the reflection to your library.
                </p>
                
                <textarea 
                  value={privateNote}
                  onChange={(e) => setPrivateNote(e.target.value)}
                  placeholder="Your personal reflection..."
                  className="w-full bg-secondary/30 border border-border rounded-2xl resize-none focus:ring-1 focus:ring-brand-green outline-none p-4 text-[15px] mb-6"
                  rows={4}
                  autoFocus
                />

                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsNoteModalOpen(false)}
                    className="flex-1 py-3 bg-secondary/60 text-foreground font-bold rounded-2xl hover:bg-secondary transition-all press-scale"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveNote}
                    disabled={isSavingNote || !privateNote.trim()}
                    className="flex-[2] py-3 text-white font-bold rounded-2xl bg-[#00a855] hover:bg-[#00a855]/90 disabled:opacity-50 transition-all shadow-brand-sm press-scale flex items-center justify-center gap-2"
                  >
                    {isSavingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bookmark className="w-4 h-4" />}
                    Save Note
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
