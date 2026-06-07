"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useViewTracker } from "@/hooks/useViewTracker";
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
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import CommentSection from "@/components/CommentSection";
import { toPng } from "html-to-image";
import { Download } from "lucide-react";
import { PostType } from "@/types";
import { getFontById } from "@/lib/fonts";
import { CardWatermark } from "@/components/CardCreator";
import InteractionBar from "@/components/InteractionBar";
import QuotedPostPreview from "@/components/QuotedPostPreview";
import HashtagText from "@/components/HashtagText";
import { format } from "date-fns";
import { usePullToRefresh } from "@/lib/usePullToRefresh";
import useSWR from "swr";
import EditPostModal from "@/components/EditPostModal";

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
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luma > 160;
};

// backgroundOptions imported from lib

export default function PostDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const { user, openSignInModal } = useAuth();
  const { showToast } = useToast();
  const [post, setPost] = useState<PostType | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const shareMenuRef = React.useRef<HTMLDivElement>(null);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const cardRef = React.useRef<HTMLDivElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [isCardFullScreen, setIsCardFullScreen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [privateNote, setPrivateNote] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isHidden, setIsHidden] = useState(false);


  // Track view with session deduplication (1 s threshold on the detail page — user is clearly reading)
  useViewTracker(cardRef, { postId: id as string, userId: user?.uid ?? null, threshold: 1000 });

  // Close menus on outside click
  // Extract prompt prefix and reflection text from saved combined string
  const getParsedData = React.useCallback(() => {
    if (!post?.promptId) return { prefix: null, text: post?.text || "" };
    const text = post.text;
    const match = text.match(/^(Reflecting on: "[^"]+")\s*([\s\S]*)$/);
    if (match) {
      return { prefix: match[1], text: match[2].trimStart() };
    }
    return { prefix: null, text: text };
  }, [post]);

  const parsedData = React.useMemo(() => getParsedData(), [getParsedData]);
  const promptPrefix = parsedData.prefix;

  useEffect(() => {
    if (post && !isEditing) {
      setEditText(parsedData.text);
    }
  }, [post, isEditing, parsedData.text]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        shareMenuRef.current &&
        !shareMenuRef.current.contains(e.target as Node)
      ) {
        setShowShareMenu(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const fetcher = (url: string) =>
    fetch(url).then((res) => {
      if (!res.ok) throw new Error("Not found");
      return res.json();
    });

  const {
    data,
    isLoading: swrLoading,
    mutate: mutatePost,
  } = useSWR(id ? `/api/posts/${id}` : null, fetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  });

  useEffect(() => {
    if (data?.post) {
      setPost(data.post);
      setLikesCount(data.post.likesCount || 0);
      setCommentsCount(data.post.commentsCount || 0);
      // editBg and editFont were unused here after moving to EditPostModal
    }
  }, [data]);

  const loading = swrLoading && !post;

  // Liked/Saved state
  useEffect(() => {
    if (user && post) {
      // These could also be converted to SWR for better caching, but let's keep them for now or wrap them
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

  const loadPost = useCallback(() => {
    mutatePost();
  }, [mutatePost]);

  const {
    containerRef,
    pullDistance,
    isRefreshing: isPullRefreshing,
  } = usePullToRefresh({
    onRefresh: loadPost,
  });

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

  // Edit modal is now handled by EditPostModal component

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
    if (
      confirm(
        "Report this reflection? It will be hidden from your feed and the admin will be notified.",
      )
    ) {
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
    const text = encodeURIComponent(
      `Thought on MindFuel by ${post.userId.name}:`,
    );
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`,
      "_blank",
    );
    setShowShareMenu(false);
  };

  const shareToWhatsApp = () => {
    if (!post) return;
    const url = `${window.location.origin}/post/${post._id}`;
    const text = encodeURIComponent(
      `Thought on MindFuel by ${post.userId.name}:\n${url}`,
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
    setShowShareMenu(false);
  };

  const downloadCard = async () => {
    if (!cardRef.current || !post) return;
    try {
      await new Promise((r) => setTimeout(r, 150));
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
      showToast("Downloading the card...");
      setShowShareMenu(false);
      setShowMenu(false);
    } catch (err) {
      console.error("Download failed", err);
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

  // onEmojiClick removed as it is now inside EditPostModal

  return (
    <div ref={containerRef} className="flex flex-col w-full min-h-screen">
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
        <div className="flex items-center gap-1">
          {/* Mobile refresh button */}
          <button
            onClick={loadPost}
            aria-label="Refresh post"
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-full hover:bg-secondary/60 transition-colors press-scale text-muted-foreground"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                isPullRefreshing || loading ? "animate-spin" : ""
              }`}
            />
          </button>
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
                      onClick={() => {
                        setIsEditing(true);
                        setShowMenu(false);
                      }}
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
                      onClick={() => {
                        if (!user) {
                          openSignInModal();
                        } else {
                          setIsNoteModalOpen(true);
                        }
                        setShowMenu(false);
                      }}
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
      </header>

      {/* Pull-to-refresh indicator */}
      <AnimatePresence>
        {(pullDistance > 8 || isPullRefreshing) && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="fixed top-16 left-0 right-0 z-50 flex justify-center pointer-events-none"
          >
            <div className="bg-background/90 backdrop-blur-sm border border-border rounded-full px-3 py-1.5 shadow-card flex items-center gap-2">
              <RefreshCw
                className={`w-3.5 h-3.5 text-brand-green ${
                  isPullRefreshing ? "animate-spin" : ""
                }`}
                style={{
                  transform: isPullRefreshing
                    ? undefined
                    : `rotate(${Math.min(pullDistance * 3, 280)}deg)`,
                }}
              />
              {isPullRefreshing && (
                <span className="text-[12px] text-muted-foreground font-medium">
                  Refreshing…
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Post content */}
      <article className="flex flex-col border-b border-border">
         <span className="p-4 text-[12px]">
              {format(new Date(post.createdAt), "h:mm a · MMM d, yyyy")}
            </span>
        {/* Author row */}
        <div className="flex items-center justify-between px-4 pb-2 -mt-3">
          
          <div className="flex  gap-3">
            <Link
              href={`/profile/${post.userId.firebaseId}`}
              className="block outline-none press-scale shrink-0"
            >
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
            <div className="flex flex-col gap- min-w-0">
              <Link
                href={`/profile/${post.userId.firebaseId}`}
                className="font-bold text-[15px] hover:underline truncate"
              >
                {post.userId.name}
              </Link>
              <Link
                href={`/profile/${post.userId.firebaseId}`}
                className="text-[13px] -mt-4 md:mt-0 text-muted-foreground truncate hover:text-foreground transition-colors"
              >
                @
                {post.userId.username ||
                  post.userId.name.replace(/\s+/g, "").toLowerCase()}
              </Link>
            </div>
           
          </div>
        </div>

        {/* Hidden Card strictly for Download generation */}
        <div className="fixed left-[-9999px] top-[-9999px]">
          <div
            ref={cardRef}
            className="relative w-[480px] aspect-[4/5] flex flex-col justify-center overflow-hidden bg-background text-left"
            style={{ ...bgStyle, color: textColor }}
          >
            {/* Texture overlays */}
            <div className="absolute inset-0 ring-1 ring-inset ring-white/10 mix-blend-overlay pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-20 pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.12)_0%,transparent_60%)] pointer-events-none" />

            <div className="relative z-10 w-full flex flex-col items-start px-10 py-8">
              <span
                className="relative mb-2 block text-[72px] font-black opacity-[0.08] leading-none"
                style={{ color: textColor, fontFamily: "'Georgia', serif" }}
              >
                &ldquo;
              </span>
              <div
                className="relative pt-2 pb-16"
                style={{
                  fontFamily: getFontById(post.fontFamily ?? "inter").family,
                }}
              >
                {promptPrefix && (
                  <div
                    className="mb-5 italic opacity-80 text-[24px]"
                    style={{
                      color: isColorLight(bgStyle.backgroundColor || "")
                        ? "rgba(0,0,0,0.6)"
                        : "#f5f5f5",
                    }}
                  >
                    {promptPrefix}
                  </div>
                )}
                <p className="relative text-[28px] font-semibold leading-[1.45] tracking-tight whitespace-pre-wrap break-words drop-shadow-sm">
                  {editText}
                </p>
              </div>
            </div>
            <CardWatermark color={textColor} isVisible={true} />
          </div>
        </div>

        {/* Visible Text Content (X-style) */}
        <div className="px-4 pb-4 pt-1">
          {promptPrefix && (
            <span className="text-muted-foreground/80 italic font-normal block mb-2 text-[15px]">
              {promptPrefix}
            </span>
          )}
          <p className="text-[17px] sm:text-[19px] whitespace-pre-wrap leading-relaxed text-foreground">
            <HashtagText text={post.text.replace(/^Reflecting on: "[^"]+"\s*/, "")} />
          </p>
          {post.imageUrl && (
            <div className="mt-4 rounded-2xl overflow-hidden border border-border">
              <Image
                src={post.imageUrl}
                alt="Attachment"
                width={800}
                height={800}
                className="w-full h-auto object-cover max-h-[600px]"
              />
            </div>
          )}
          {post.quotedPostId && (
            <div className="mt-4">
              <QuotedPostPreview post={post.quotedPost} />
            </div>
          )}
        </div>

        {/* Engagement counts moved into InteractionBar behavior, but we keep the visual divider for density */}
        <div className="px-4 py-3 border-b border-border flex items-center gap-2 text-[13px] text-muted-foreground">
          <span className="font-bold text-foreground">
            {fmt(post.views || 0)}
          </span>
          <span>Views</span>
          <span>·</span>
          <span className="font-bold text-foreground">{fmt(likesCount)}</span>
          <span>Likes</span>
          <span>·</span>
          <span className="font-bold text-foreground">
            {fmt(post.repostCount || 0)}
          </span>
          <span>Reposts</span>
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
          >
            <div className="flex justify-center relative" ref={shareMenuRef}>
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
                    <MessageCircle className="w-4 h-4 text-[#25D366]" /> Share
                    to WhatsApp
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
          </InteractionBar>
        </div>
      </article>

      {/* Comments */}
      <div className="flex-1 w-full pb-32">
        <CommentSection
          postId={post._id}
          onCommentAdded={() => setCommentsCount((prev) => prev + 1)}
          onCommentDeleted={() => setCommentsCount((prev) => prev - 1)}
        />
      </div>

      {/* Edit Modal */}
      <EditPostModal
        post={post}
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        onSave={() => {
          // Mutate is handled inside EditPostModal
        }}
      />

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
                  style={{
                    fontFamily: getFontById(post.fontFamily ?? "inter").family,
                    color: textColor,
                  }}
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
                <h3 className="text-[17px] font-bold tracking-tight text-brand-green">
                  Private Note
                </h3>
                <button
                  onClick={() => setIsNoteModalOpen(false)}
                  className="p-2 hover:bg-secondary/60 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                <p className="text-[13px] text-muted-foreground mb-4">
                  Reflect on this thought. This note is only visible to you and
                  will save the reflection to your library.
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
                    {isSavingNote ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )}
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
