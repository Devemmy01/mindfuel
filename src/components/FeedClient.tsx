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

const FEED_CACHE_PREFIX = "mindfuel:feed:";
const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Unable to load feed");
  return res.json();
}).then((data) => data.posts || []);

function readCachedPosts(type: "feed" | "reflections") {
  if (typeof window === "undefined") return [];
  try {
    const value = window.localStorage.getItem(`${FEED_CACHE_PREFIX}${type}`);
    if (!value) return [];
    const parsed = JSON.parse(value) as { posts?: PostType[]; timestamp?: number };
    if (!parsed.timestamp || Date.now() - parsed.timestamp > 86_400_000) return [];
    return parsed.posts || [];
  } catch {
    return [];
  }
}

function persistPosts(type: "feed" | "reflections", posts?: PostType[]) {
  if (!posts?.length || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      `${FEED_CACHE_PREFIX}${type}`,
      JSON.stringify({ posts: posts.slice(0, 20), timestamp: Date.now() })
    );
  } catch {
    // Storage can be unavailable in private mode; SWR still retains memory cache.
  }
}

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

export default function FeedClient({ initialReflectionPosts = [] }: { initialReflectionPosts?: PostType[] }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"feed" | "reflections">("reflections");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [persistedFeed, setPersistedFeed] = useState<PostType[]>([]);
  const [persistedReflections, setPersistedReflections] = useState<PostType[]>(initialReflectionPosts);

  useEffect(() => {
    setPersistedFeed(readCachedPosts("feed"));
    const cachedReflections = readCachedPosts("reflections");
    if (cachedReflections.length) setPersistedReflections(cachedReflections);
  }, []);

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
      revalidateIfStale: true,
      revalidateOnReconnect: true,
      dedupingInterval: 120000,
      errorRetryInterval: 10000,
      keepPreviousData: true,
      fallbackData: activeTab === "feed" ? persistedFeed : undefined,
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
      revalidateIfStale: true,
      revalidateOnReconnect: true,
      dedupingInterval: 120000,
      errorRetryInterval: 10000,
      keepPreviousData: true,
      fallbackData: initialReflectionPosts.length ? initialReflectionPosts : persistedReflections,
    }
  );

  useEffect(() => persistPosts("feed", feedPosts), [feedPosts]);
  useEffect(() => persistPosts("reflections", reflectionPosts), [reflectionPosts]);

  const posts = activeTab === "feed"
    ? (feedPosts?.length ? feedPosts : persistedFeed)
    : (reflectionPosts?.length ? reflectionPosts : persistedReflections);
  const activeReflectors = React.useMemo(() => {
    const activity = new Map<string, { person: PostType["userId"]; count: number; firstSeen: number }>();
    const visibleReflections = reflectionPosts?.length ? reflectionPosts : persistedReflections;
    visibleReflections.forEach((post, index) => {
      const author = post.userId;
      if (!author?.firebaseId) return;
      const current = activity.get(author.firebaseId);
      activity.set(author.firebaseId, {
        person: author,
        count: (current?.count || 0) + 1,
        firstSeen: current?.firstSeen ?? index,
      });
    });
    return Array.from(activity.values())
      .sort((a, b) => b.count - a.count || a.firstSeen - b.firstSeen)
      .slice(0, 5)
      .map((entry) => entry.person);
  }, [reflectionPosts, persistedReflections]);
  const loading = activeTab === "feed"
    ? (!feedPosts?.length && !persistedFeed.length && feedLoading)
    : (!reflectionPosts?.length && !persistedReflections.length && reflectionLoading);
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
          <div className="grid grid-cols-2 gap-1.5 rounded-full border border-white/[0.09] bg-[#050d09]/90 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.025),0_8px_24px_rgba(0,0,0,0.16)]">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "reflections"}
              onClick={() => handleTabClick("reflections")}
              className={`group relative flex items-center justify-center gap-2 overflow-hidden rounded-full border px-3 py-2.5 text-[13px] font-bold transition-colors ${
                activeTab === "reflections"
                  ? "border-transparent text-white"
                  : "border-transparent text-muted-foreground hover:border-white/[0.06] hover:bg-white/[0.035] hover:text-foreground"
              }`}
            >
              {activeTab === "reflections" && (
                <motion.span
                  layoutId="feed-active-tab"
                  className="absolute inset-0 rounded-full border border-brand-green/40 bg-gradient-to-b from-brand-green/[0.18] to-brand-green/[0.09] shadow-[0_8px_22px_rgba(0,191,99,0.10),inset_0_1px_0_rgba(255,255,255,0.06)]"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <BookOpen
                className={`relative h-4 w-4 transition-colors ${
                  activeTab === "reflections" ? "text-emerald-300" : "text-muted-foreground"
                }`}
                strokeWidth={activeTab === "reflections" ? 2.5 : 2}
              />
              <span className="relative">Reflections</span>
              {activeTab === "reflections" && (
                <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.8)]" />
              )}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "feed"}
              onClick={() => handleTabClick("feed")}
              className={`group relative flex items-center justify-center gap-2 overflow-hidden rounded-full border px-3 py-2.5 text-[13px] font-bold transition-colors ${
                activeTab === "feed"
                  ? "border-transparent text-white"
                  : "border-transparent text-muted-foreground hover:border-white/[0.06] hover:bg-white/[0.035] hover:text-foreground"
              }`}
            >
              {activeTab === "feed" && (
                <motion.span
                  layoutId="feed-active-tab"
                  className="absolute inset-0 rounded-full border border-brand-green/40 bg-gradient-to-b from-brand-green/[0.18] to-brand-green/[0.09] shadow-[0_8px_22px_rgba(0,191,99,0.10),inset_0_1px_0_rgba(255,255,255,0.06)]"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <Users
                className={`relative h-4 w-4 transition-colors ${
                  activeTab === "feed" ? "text-emerald-300" : "text-muted-foreground"
                }`}
                strokeWidth={activeTab === "feed" ? 2.5 : 2}
              />
              <span className="relative">Feed</span>
              {activeTab === "feed" && (
                <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.8)]" />
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
        ) : activeTab === "reflections" ? (
          <div key={`${activeTab}-content`} className="relative">
              <div className="pt-4">
                <DailyReflectionPrompt reflectors={activeReflectors} />
                <div className="mt-4">
                  {posts.map((post, i) => (
                    <div
                      key={post.isRepost ? `${post._id}-repost-${post.repostedBy?.firebaseId || i}` : post._id}
                    >
                      <PostCard post={post} isHighlighted={true} />
                    </div>
                  ))}
                  {posts.length === 0 && (
                    <div className="px-6 py-16 text-center">
                      <h3 className="text-lg font-bold">Be the first to reflect today</h3>
                      <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">Your perspective may be exactly what someone else needs to read.</p>
                    </div>
                  )}
                </div>
              </div>
          </div>
        ) : posts.length > 0 ? (
          <div key="feed-content" className="relative">
              {posts.map((post, i) => (
                  <div
                    key={post.isRepost ? `${post._id}-repost-${post.repostedBy?.firebaseId || i}` : post._id}
                  >
                    <PostCard post={post} />
                  </div>
                ))}

            {/* End of list indicator */}
            <div className="py-16 flex flex-col items-center justify-center opacity-40">
              <div className="w-1.5 h-1.5 rounded-full bg-foreground mb-4" />
              <p className="text-[13px] font-medium text-foreground tracking-wide">You&apos;re all caught up</p>
            </div>
            <div className="h-6 w-full" />
          </div>
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
              <h3 className="text-xl font-bold">No reflections in your feed yet</h3>
              <p className="text-muted-foreground text-[14px] max-w-[260px]">
                Follow others or share a reflection to get started.
              </p>
            </div>
            <Link
              href="/create"
              className="px-8 py-3 text-white rounded-full font-bold text-[15px] bg-[#00a855] transition-colors shadow-brand-sm press-scale"
            >
              Share a Reflection
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom padding for mobile nav */}
      <div className="mobile-content-offset" />
    </div>
  );
}
