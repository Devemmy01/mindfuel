"use client";

import React, { useEffect, useState } from "react";
import PostCard from "@/components/PostCard";
import OnboardingOverlay from "@/components/OnboardingOverlay";
import DailyReflectionPrompt from "@/components/DailyReflectionPrompt";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, BookOpen, RefreshCw, Users } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { PostType } from "@/types";
import { useAuth } from "@/providers/AuthProvider";
import { usePullToRefresh } from "@/lib/usePullToRefresh";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json()).then((data) => data.posts || []);

// Skeleton card
function SkeletonCard() {
  return (
    <div className="flex px-4 py-4 border-b border-border gap-3">
      <div className="skeleton w-10 h-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="skeleton h-3 w-32 rounded-full" />
        <div className="skeleton h-24 rounded-2xl w-full" />
        <div className="flex gap-6 mt-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-3 w-8 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function FeedClient() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"feed" | "reflections">("reflections");
  const [showScrollTop, setShowScrollTop] = useState(false);

  const userIdParam = user?.uid ? `&userId=${user.uid}` : "";
  const feedUrl = `/api/posts/feed?type=feed${userIdParam}`;
  const reflectionsUrl = `/api/posts/feed?type=reflections${userIdParam}`;

  const {
    data: feedPosts,
    isLoading: feedLoading,
    isValidating: feedValidating,
    mutate: mutateFeed,
  } = useSWR<PostType[]>(
    activeTab === "feed" ? feedUrl : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
      keepPreviousData: true
    }
  );

  const {
    data: reflectionPosts,
    isLoading: reflectionLoading,
    isValidating: reflectionsValidating,
    mutate: mutateReflections,
  } = useSWR<PostType[]>(
    activeTab === "reflections" ? reflectionsUrl : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
      keepPreviousData: true
    }
  );

  const posts = activeTab === "feed" ? (feedPosts || []) : (reflectionPosts || []);
  const loading = activeTab === "feed" ? (!feedPosts && feedLoading) : (!reflectionPosts && reflectionLoading);
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 520);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleTabClick = (tab: "feed" | "reflections") => {
    if (activeTab === tab) {
      scrollToTop();
    } else {
      setActiveTab(tab);
    }
  };

  // Pull-to-refresh
  const { containerRef, pullDistance, isRefreshing: isPullRefreshing } = usePullToRefresh({
    onRefresh: async () => {
      if (activeTab === "feed") {
        await mutateFeed();
      } else {
        await mutateReflections();
      }
    },
  });
  const isRefreshing =
    isPullRefreshing ||
    (activeTab === "feed" ? feedValidating : reflectionsValidating);

  const handleRefresh = async () => {
    if (isRefreshing) return;

    if (activeTab === "feed") {
      await mutateFeed();
    } else {
      await mutateReflections();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <OnboardingOverlay />

      {/* Pull-to-refresh indicator — fixed so it doesn't affect layout */}
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
                className={`w-3.5 h-3.5 text-brand-green ${isPullRefreshing ? "animate-spin" : ""
                  }`}
                style={{
                  transform: isPullRefreshing
                    ? undefined
                    : `rotate(${Math.min(pullDistance * 3, 280)}deg)`,
                }}
              />
              {isPullRefreshing && (
                <span className="text-[12px] text-muted-foreground font-medium">Refreshing…</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showScrollTop && (
          <div className="sticky top-24 z-50 flex justify-center pointer-events-none md:top-20">
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.21, 0.47, 0.32, 0.98] }}
              onClick={scrollToTop}
              aria-label="Scroll to top"
              className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-[#00a855] px-4 py-2.5 text-[13px] font-bold text-white shadow-[0_14px_35px_rgba(0,168,85,0.35)] backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-[#00914a] active:scale-[0.98]"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
                <ArrowUp className="h-4 w-4" strokeWidth={2.6} />
              </span>
              <span className="whitespace-nowrap">Back to top</span>
            </motion.button>
          </div>
        )}
      </AnimatePresence>

      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-2xl">
        {/* Desktop/Mobile top bar */}
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2.5 md:hidden">
            <Image
              src="/logoDarkbg.png"
              alt="MindFuel"
              width={120}
              height={36}
              className="h-9 w-auto object-contain"
            />
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label={isRefreshing ? "Refreshing feed" : "Refresh feed"}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-secondary/25 text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground active:scale-95 disabled:cursor-wait disabled:opacity-70 md:hidden"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin text-brand-green" : ""}`}
              aria-hidden="true"
            />
          </button>
        </div>
        {/* Feed view switcher */}
        <div className="px-3 pb-2" role="tablist" aria-label="Feed view">
          <div className="grid grid-cols-2 gap-1 rounded-2xl border border-border/60 bg-secondary/20 p-1 shadow-inner shadow-black/5">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "reflections"}
              onClick={() => handleTabClick("reflections")}
              className={`group relative flex items-center justify-center gap-2 overflow-hidden rounded-xl px-3 py-2.5 text-[13px] font-bold transition-colors ${
                activeTab === "reflections"
                  ? "text-foreground"
                  : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
              }`}
            >
              {activeTab === "reflections" && (
                <motion.span
                  layoutId="feed-active-tab"
                  className="absolute inset-0 rounded-xl border border-brand-green/15 bg-gradient-to-b from-brand-green/10 to-brand-green/[0.035] shadow-[0_6px_18px_rgba(0,0,0,0.12)]"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <BookOpen
                className={`relative h-4 w-4 transition-colors ${
                  activeTab === "reflections" ? "text-brand-green" : "text-muted-foreground"
                }`}
                strokeWidth={activeTab === "reflections" ? 2.5 : 2}
              />
              <span className="relative">Reflections</span>
              {activeTab === "reflections" && (
                <span className="relative h-1.5 w-1.5 rounded-full bg-brand-green shadow-[0_0_8px_rgba(0,191,99,0.75)]" />
              )}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "feed"}
              onClick={() => handleTabClick("feed")}
              className={`group relative flex items-center justify-center gap-2 overflow-hidden rounded-xl px-3 py-2.5 text-[13px] font-bold transition-colors ${
                activeTab === "feed"
                  ? "text-foreground"
                  : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
              }`}
            >
              {activeTab === "feed" && (
                <motion.span
                  layoutId="feed-active-tab"
                  className="absolute inset-0 rounded-xl border border-brand-green/15 bg-gradient-to-b from-brand-green/10 to-brand-green/[0.035] shadow-[0_6px_18px_rgba(0,0,0,0.12)]"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <Users
                className={`relative h-4 w-4 transition-colors ${
                  activeTab === "feed" ? "text-brand-green" : "text-muted-foreground"
                }`}
                strokeWidth={activeTab === "feed" ? 2.5 : 2}
              />
              <span className="relative">Feed</span>
              {activeTab === "feed" && (
                <span className="relative h-1.5 w-1.5 rounded-full bg-brand-green shadow-[0_0_8px_rgba(0,191,99,0.75)]" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Feed ── */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </motion.div>
        ) : posts.length > 0 ? (
          <motion.div
            key={`${activeTab}-content`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative"
          >
            {activeTab === "reflections" ? (
              <div className="px- pt-4">
                <DailyReflectionPrompt responseCount={posts.length} />
                <div className="mt-4">
                  {posts.map((post, i) => (
                    <motion.div
                      key={post.isRepost ? `${post._id}-repost-${post.repostedBy?.firebaseId || i}` : post._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.4,
                        ease: [0.21, 0.47, 0.32, 0.98],
                        delay: Math.min(i * 0.05, 0.3)
                      }}
                    >
                      <PostCard post={post} isHighlighted={true} />
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {posts.map((post, i) => (
                  <motion.div
                    key={post.isRepost ? `${post._id}-repost-${post.repostedBy?.firebaseId || i}` : post._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.4,
                      ease: [0.21, 0.47, 0.32, 0.98],
                      delay: Math.min(i * 0.05, 0.3)
                    }}
                  >
                    <PostCard post={post} />
                  </motion.div>
                ))}
              </>
            )}

            {/* End of list indicator */}
            <div className="py-16 flex flex-col items-center justify-center opacity-40">
              <div className="w-1.5 h-1.5 rounded-full bg-foreground mb-4" />
              <p className="text-[13px] font-medium text-foreground tracking-wide">You&apos;re all caught up</p>
            </div>
            <div className="h-6 w-full" />
          </motion.div>
        ) : (
          <motion.div
            key={`${activeTab}-empty`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 py-20 flex flex-col items-center justify-center space-y-5 text-center"
          >
            <div className="w-20 h-20 bg-brand-green/10 border border-brand-green/20 rounded-full flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-brand-green/50" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">
                {activeTab === "reflections" ? "What lesson are you carrying today?" : "No reflections in your feed yet"}
              </h3>
              <p className="text-muted-foreground text-[14px] max-w-[260px]">
                {activeTab === "reflections"
                  ? "Start your reflection journey. Share what life is teaching you."
                  : "Follow others or share a reflection to get started."}
              </p>
            </div>
            <Link
              href="/create"
              className="px-8 py-3 text-white rounded-full font-bold text-[15px] bg-[#00a855] transition-colors shadow-brand-sm press-scale"
            >
              {activeTab === "feed" ? "Share a Reflection" : "Start Reflecting"}
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom padding for mobile nav */}
      <div className="mobile-content-offset" />
    </div>
  );
}
