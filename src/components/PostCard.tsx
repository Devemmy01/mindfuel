"use client";

import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import {
  MoreHorizontal,
  Link as LinkIcon,
  Twitter,
  Eye,
  Trash2,
  Edit,
  X,
  Loader2,
  Share2,
  MessageCircle,
  Repeat2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { PostType } from "@/types";
import { Download } from "lucide-react";
import InteractionBar from "@/components/InteractionBar";
import QuotedPostPreview from "@/components/QuotedPostPreview";
import DownloadCardModal from "@/components/DownloadCardModal";
import EditPostModal from "@/components/EditPostModal";

// EmojiPicker removal from here as it is now in EditPostModal

interface PostCardProps {
  post: PostType;
  isHighlighted?: boolean;
}

const PostCard: React.FC<PostCardProps> = ({ post, isHighlighted = false }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [privateNote, setPrivateNote] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Edit state
  const getParsedText = () => {
    if (!post.promptId) return post.text;
    const match = post.text.match(/^Reflecting on: "[^"]+"\s*([\s\S]*)$/);
    return match ? match[1].trimStart() : post.text;
  };
  const promptPrefix = post.promptId
    ? (post.text.match(/^(Reflecting on: "[^"]+")/)?.[1] ?? null)
    : null;

  const menuRef = useRef<HTMLDivElement>(null);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const viewFetched = useRef(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setShowMenu(false);
      if (
        shareMenuRef.current &&
        !shareMenuRef.current.contains(e.target as Node)
      )
        setShowShareMenu(false);
    };
    if (showMenu || showShareMenu)
      document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu, showShareMenu]);

  useEffect(() => {
    if (!viewFetched.current) {
      viewFetched.current = true;
      const track = () => {
        fetch(`/api/posts/${post._id}/view`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user?.uid }),
        }).catch(() => {});
      };
      if ("requestIdleCallback" in window) {
        requestIdleCallback(track);
      } else {
        setTimeout(track, 200);
      }
    }
  }, [post._id, user?.uid]);

  // onEmojiClick removed as it is now in EditPostModal

  const copyLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/post/${post._id}`);
    showToast("Link copied!", "success");
    setShowShareMenu(false);
    setShowMenu(false);
  };

  const shareToX = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/post/${post._id}`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Thought on MindFuel by ${post.userId.name}:`)}&url=${encodeURIComponent(url)}`,
      "_blank",
    );
    setShowShareMenu(false);
  };

  const shareToWhatsApp = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/post/${post._id}`;
    window.open(
      `https://api.whatsapp.com/send?text=${encodeURIComponent(`Thought on MindFuel by ${post.userId.name}:\n${url}`)}`,
      "_blank",
    );
    setShowShareMenu(false);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || user.uid !== post.userId.firebaseId) return;
    if (!confirm("Delete this thought?")) return;
    try {
      const res = await fetch(`/api/posts/${post._id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      });
      if (res.ok) window.location.reload();
    } catch (err) {
      console.error(err);
    }
  };

  // Edit modal is now handled by EditPostModal component

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
        setIsNoteModalOpen(false);
        showToast("Private note saved", "success");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleReport = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (
      !confirm(
        "Report this reflection? It will be hidden and the admin notified.",
      )
    )
      return;
    setIsHidden(true);
    setShowMenu(false);
    try {
      await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post._id, userId: user?.uid }),
      });
      showToast("Post reported", "warning");
    } catch (err) {
      console.error(err);
    }
  };

  if (isHidden) return null;

  const timeAgo = formatDistanceToNow(new Date(post.createdAt), {
    addSuffix: false,
  })
    .replace("about ", "")
    .replace("less than a minute", "now");

  const handle =
    post.userId.username || post.userId.name.replace(/\s+/g, "").toLowerCase();

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => router.push(`/post/${post._id}`)}
        className={`flex flex-col border-b cursor-pointer group transition-colors ${
          isHighlighted
            ? "border-brand-green/20 hover:bg-brand-green/[0.03]"
            : "border-border hover:bg-secondary/20"
        }`}
      >
        {post.isRepost && post.repostedBy && (
          <div className="flex gap-1.5 text-white/50 text-[13px] font-semibold px-4 pt-2.5 pb-0 ml-10">
            <Repeat2 className="w-4 h-4" strokeWidth={2.5} />
            <Link
              href={`/profile/${post.repostedBy.firebaseId}`}
              onClick={(e) => e.stopPropagation()}
              className="hover:underline"
            >
              {post.repostedBy.firebaseId === user?.uid
                ? "You reposted"
                : `${post.repostedBy.name} reposted`}
            </Link>
          </div>
        )}

        <div
          className={`flex px-4 ${post.isRepost && post.repostedBy ? "-mt-2 md:mt-0 pb-3.5" : "py-3.5"}`}
        >
          {/* Avatar */}
          <div className="mr-3 flex-shrink-0 pt-0.5">
            <Link
              href={`/profile/${post.userId.firebaseId}`}
              onClick={(e) => e.stopPropagation()}
              className="block press-scale outline-none"
            >
              {post.userId.image &&
              !post.userId.image.startsWith("#") &&
              !imgError ? (
                <Image
                  src={post.userId.image}
                  alt={post.userId.name}
                  width={40}
                  height={40}
                  onError={() => setImgError(true)}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-transparent group-hover:ring-brand-green/20 transition-all"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-[14px] font-bold text-white"
                  style={{ backgroundColor: "#1a1a2e" }}
                >
                  {post.userId.name?.[0]?.toUpperCase()}
                </div>
              )}
            </Link>
          </div>

          {/* Content column */}
          <div className="flex flex-col flex-1 min-w-0">
            {/* Name row */}
            <div className="flex items-start justify-between mb-1">
              <div className="md:flex md:flex-wrap gap-x-1.5 min-w-0 flex-1 mr-2 mt-0 md:mt-[10px]">
                <Link
                  href={`/profile/${post.userId.firebaseId}`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-bold text-[15px] hover:underline break-words"
                >
                  {post.userId.name}
                </Link>
                <div className="flex gap-1 pb-3 md:pb-0 shrink-0">
                  <span className="text-muted-foreground text-[14px]">
                    @{handle}
                  </span>
                  <span className="text-muted-foreground text-[14px]">
                    ·
                  </span>
                  <span className="text-muted-foreground text-[14px] whitespace-nowrap">
                    {timeAgo}
                  </span>
                  {post.isSponsored && (
                    <span className="brand-pill ml-1 shrink-0">Promoted</span>
                  )}
                </div>
              </div>

              {/* ⋯ Menu */}
              <div className="relative flex-shrink-0" ref={menuRef}>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowMenu((p) => !p);
                  }}
                  aria-label="Post options"
                  className="p-1.5 -mr-1 rounded-full text-muted-foreground hover:text-brand-green hover:bg-brand-green/10 transition-colors"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-popover popover-solid border border-border rounded-xl shadow-card py-1 z-50 animate-scale-in">
                    {user?.uid === post.userId.firebaseId ? (
                      <>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsEditing(true);
                            setShowMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-[13px] font-medium hover:bg-secondary/60 transition-colors"
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
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsNoteModalOpen(true);
                            setShowMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-[13px] font-medium hover:bg-secondary/60 transition-colors"
                        >
                          <Edit className="w-4 h-4" /> Private Note
                        </button>
                        <button
                          onClick={copyLink}
                          className="w-full flex items-center gap-3 px-4 py-2 text-[13px] font-medium hover:bg-secondary/60 transition-colors"
                        >
                          <LinkIcon className="w-4 h-4" /> Copy Link
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsDownloadOpen(true);
                            setShowMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-[13px] font-medium hover:bg-secondary/60 transition-colors border-b border-border/50"
                        >
                          <Download className="w-4 h-4" /> Download Card
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

            {/* Prompt prefix */}
            {promptPrefix && (
              <p className="text-[13px] text-muted-foreground italic mb-1">
                {promptPrefix}
              </p>
            )}

            {/* Post text */}
            <p className="text-[15px] leading-relaxed text-foreground whitespace-pre-wrap break-words mb-3">
              {getParsedText()}
            </p>

            {/* Attached image */}
            {post.imageUrl && (
              <div
                className="mb-3 rounded-2xl overflow-hidden border border-border max-h-[320px]"
                onClick={(e) => e.stopPropagation()}
              >
                <Image
                  src={post.imageUrl}
                  alt="Post image"
                  width={600}
                  height={400}
                  className="w-full object-cover max-h-[320px]"
                />
              </div>
            )}



            {/* Quoted post */}
            {post.quotedPostId && (
              <QuotedPostPreview post={post.quotedPost} />
            )}

            {/* Action bar */}
            <div className="flex items-center w-full mt-1">
              <InteractionBar
                postId={post._id}
                initialLikes={post.likesCount}
                initialViews={post.views}
                initialComments={post.commentsCount || 0}
                initialIsLiked={post.isLiked ?? false}
                initialIsSaved={post.isSaved ?? false}
                initialIsReposted={post.isReposted ?? false}
                initialReposts={post.repostCount ?? 0}
              >
                {/* Share dropdown */}
                <div className="relative flex items-center" ref={shareMenuRef}>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowShareMenu((p) => !p);
                    }}
                    aria-label="Share"
                    className="flex items-center group/btn transition-colors hover:text-brand-green outline-none"
                  >
                    <div className="p-1.5 sm:p-2 rounded-full group-hover/btn:bg-brand-green/10 transition-colors">
                      <Share2
                        className={`w-[16px] h-[16px] sm:w-[18px] sm:h-[18px] ${showShareMenu ? "text-brand-green" : ""}`}
                        strokeWidth={1.75}
                      />
                    </div>
                  </button>
                  {showShareMenu && (
                    <div className="absolute right-0 bottom-full mb-2 w-48 bg-popover popover-solid border border-border rounded-xl shadow-card py-1 z-50 animate-scale-in">
                      <button
                        onClick={copyLink}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium hover:bg-secondary/60 transition-colors"
                      >
                        <LinkIcon className="w-4 h-4 text-muted-foreground" />{" "}
                        Copy Link
                      </button>
                      <button
                        onClick={shareToX}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium hover:bg-secondary/60 transition-colors"
                      >
                        <Twitter className="w-4 h-4 text-[#1DA1F2]" /> Share to
                        X
                      </button>
                      <button
                        onClick={shareToWhatsApp}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium hover:bg-secondary/60 transition-colors border-b border-border/50"
                      >
                        <MessageCircle className="w-4 h-4 text-[#25D366]" />{" "}
                        Share to WhatsApp
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsDownloadOpen(true);
                          setShowShareMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium hover:bg-secondary/60 transition-colors"
                      >
                        <Download className="w-4 h-4 text-brand-green" />{" "}
                        Download Card
                      </button>
                    </div>
                  )}
                </div>
              </InteractionBar>
            </div>
          </div>
        </div>
      </motion.article>

      {/* Download Card Modal */}
      <DownloadCardModal
        post={post}
        isOpen={isDownloadOpen}
        onClose={() => setIsDownloadOpen(false)}
      />

      {/* Edit Modal */}
      <EditPostModal
        post={post}
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        onSave={() => {
          // No need to reload, SWR mutate inside EditPostModal handles it
        }}
      />

      {/* Private Note Modal */}
      <AnimatePresence>
        {isNoteModalOpen && (
          <motion.div
            key="note-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
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
                <h3 className="text-[17px] font-bold text-brand-green">
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
                  Reflect on this thought. Visible only to you.
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
                    className="flex-1 py-3 bg-secondary/60 font-bold rounded-2xl hover:bg-secondary transition-all press-scale"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveNote}
                    disabled={isSavingNote || !privateNote.trim()}
                    className="flex-[2] py-3 bg-[#00a855] text-white font-bold rounded-2xl disabled:opacity-50 transition-all shadow-brand-sm press-scale flex items-center justify-center gap-2"
                  >
                    {isSavingNote ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : null}
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
