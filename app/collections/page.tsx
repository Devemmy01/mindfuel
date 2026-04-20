"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import PostCard from "@/components/PostCard";
import { Bookmark, Loader2, LayoutGrid, List } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { SaveType } from "@/types";

// Category filters removed as requested

// Mini tile for masonry view
function BookmarkTile({ save }: { save: SaveType }) {
  const post = save.postId;
  const isLight =
    post.backgroundStyle.value === "#ffffff" ||
    post.backgroundStyle.value.toLowerCase() === "#f5f5dc";
  const textColor = isLight ? "#171717" : "#ffffff";
  const bgStyle =
    post.backgroundStyle.type === "gradient"
      ? { backgroundImage: post.backgroundStyle.value }
      : { backgroundColor: post.backgroundStyle.value };

  return (
    <Link href={`/post/${post._id}`} className="block outline-none">
      <motion.div
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.97 }}
        className="rounded-2xl overflow-hidden shadow-soft border border-black/5 dark:border-white/5 cursor-pointer"
        style={{ ...bgStyle, color: textColor }}
      >
        <div className="p-3.5">
          <p className="text-[13px] font-semibold leading-[1.5] break-words" style={{ color: textColor }}>
            {post.text.length > 100 ? post.text.slice(0, 100) + "…" : post.text}
          </p>
          <div
            className="flex items-center gap-1.5 mt-2.5 pt-2 border-t"
            style={{ borderColor: `${textColor}20` }}
          >
            {post.userId.image ? (
              <Image src={post.userId.image} alt="" width={16} height={16} className="w-4 h-4 rounded-full object-cover" />
            ) : (
              <div className="w-4 h-4 rounded-full" style={{ background: `${textColor}30` }} />
            )}
            <span className="text-[11px] font-medium truncate" style={{ color: `${textColor}bb` }}>
              {post.userId.name}
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

export default function CollectionsPage() {
  const { user, login, loading: authLoading } = useAuth();
  const [saves, setSaves] = useState<SaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    if (user) {
      const fetchSaves = async () => {
        try {
          const res = await fetch(`/api/saves?userId=${user.uid}`);
          const data = await res.json();
          setSaves(data.saves || []);
        } catch (err) {
          console.error("Fetch saves failed", err);
        } finally {
          setLoading(false);
        }
      };
      fetchSaves();
    }
  }, [user]);

  if (authLoading)
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-7 h-7 animate-spin text-brand-green" />
      </div>
    );

  if (!user)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center space-y-6">
        <div className="w-20 h-20 bg-brand-green/10 border border-brand-green/20 rounded-full flex items-center justify-center">
          <Bookmark className="w-9 h-9 text-brand-green" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Your Bookmarks</h1>
          <p className="text-muted-foreground text-[14px] max-w-[260px]">
            Sign in to save thoughts and build your personal library.
          </p>
        </div>
        <button 
          onClick={login}
          className="px-8 py-3 text-white rounded-full font-bold text-[15px] shadow-brand-sm bg-[#00a855] cursor-pointer transition-colors press-scale"
        >
          Sign In with Google
        </button>
      </div>
    );

  return (
    <div className="flex flex-col w-full min-h-screen">

      {/* Header */}
      <header className="sticky top-0 z-40 glass-strong border-b border-border/60 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-[18px] tracking-tight">Bookmarks</h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              @{user.displayName?.replace(/\s+/g, "").toLowerCase()} · {saves.length} saved
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <button
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              className="p-2 rounded-xl hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-foreground"
            >
              {viewMode === "grid" ? <List className="w-4.5 h-4.5 w-[18px] h-[18px]" /> : <LayoutGrid className="w-[18px] h-[18px]" />}
            </button>
          </div>
        </div>

        {/* Category filters removed */}
      </header>

      {loading ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-brand-green" />
        </div>
      ) : saves.length > 0 ? (
        <div className={`${viewMode === "grid" ? "px-3 py-4" : "py-0"}`}>
          {viewMode === "grid" ? (
            <div className="masonry-grid">
              {saves.map((save, i) => (
                <motion.div
                  key={save._id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <BookmarkTile save={save} />
                </motion.div>
              ))}
            </div>
          ) : (
            saves.map((save) => <PostCard key={save._id} post={save.postId} />)
          )}
        </div>
      ) : (
        <div className="py-20 flex flex-col items-center justify-center text-center space-y-5 px-6">
          <div className="w-20 h-20 bg-brand-green/10 border border-brand-green/20 rounded-full flex items-center justify-center">
            <Bookmark className="w-9 h-9 text-brand-green/60" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold">Nothing saved yet</h3>
            <p className="text-muted-foreground text-[14px] max-w-[260px]">
              Tap the bookmark icon on any thought to save it here.
            </p>
          </div>
          <Link
            href="/"
            className="px-8 py-3 bg-brand-green text-white rounded-full font-bold text-[15px] hover:bg-[#00a855] transition-colors shadow-brand-sm press-scale"
          >
            Browse Feed
          </Link>
        </div>
      )}

      <div className="mobile-content-offset" />
    </div>
  );
}
