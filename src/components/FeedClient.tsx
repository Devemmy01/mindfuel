"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import PostCard from "@/components/PostCard";
import OnboardingOverlay from "@/components/OnboardingOverlay";
import DailyReflectionPrompt from "@/components/DailyReflectionPrompt";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, RefreshCw } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { PostType } from "@/types";
import { useAuth } from "@/providers/AuthProvider";

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

interface FeedClientProps {
  initialPosts: PostType[];
  initialHasMore: boolean;
}

export default function FeedClient({ initialPosts, initialHasMore }: FeedClientProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"feed" | "reflections">("feed");
  const [posts, setPosts] = useState<PostType[]>(initialPosts);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const currentPageRef = useRef(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerTarget = React.useRef<HTMLDivElement>(null);

  const fetchPosts = useCallback(async (isRefresh = false, pageNum = 1) => {
    if (isRefresh) {
      setRefreshing(true);
      currentPageRef.current = 1;
      setHasMore(true);
    } else if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const userId = user?.uid ? `&userId=${user.uid}` : "";
      const res = await fetch(`/api/posts/feed?page=${pageNum}&limit=10${userId}`);
      const data = await res.json();

      if (pageNum === 1) {
        setPosts(data.posts || []);
      } else {
        setPosts((prev) => [...prev, ...(data.posts || [])]);
      }

      setHasMore(data.hasMore);
    } catch (err) {
      console.error("Failed to fetch posts", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [user]);

  useEffect(() => {
    const currentTarget = observerTarget.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          const next = ++currentPageRef.current;
          fetchPosts(false, next);
        }
      },
      { threshold: 0.1 },
    );

    if (currentTarget) observer.observe(currentTarget);
    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [hasMore, loading, loadingMore, fetchPosts]);

  const hasFetched = useRef(false);
  const lastUserId = useRef<string | undefined>(undefined);

  useEffect(() => {
    // Fetch immediately on mount if we have no initial posts
    if (!hasFetched.current && initialPosts.length === 0) {
      hasFetched.current = true;
      lastUserId.current = user?.uid;
      fetchPosts(false, 1);
    } 
    // If user state hydrates later (logs in), refresh in background to get likes/saves
    else if (user && user.uid !== lastUserId.current && hasFetched.current) {
      lastUserId.current = user.uid;
      fetchPosts(true);
    }
  }, [user, fetchPosts, initialPosts.length]);

  return (
    <>
      <OnboardingOverlay />

      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-40 glass-strong border-b border-border/60">
        {/* Desktop/Mobile top bar */}
        <div className="flex justify-between md:justify-end items-center px-4 py-2">
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
            onClick={() => fetchPosts(true)}
            aria-label="Refresh feed"
            className="w-9 h-9 flex items-center md:hidden justify-center rounded-full hover:bg-secondary/60 transition-colors press-scale"
          >
            <RefreshCw
              className={`w-4 h-4 text-muted-foreground ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {/* Simple header title */}
        <div className="flex border-b border-border/30">
          <button
            onClick={() => setActiveTab("feed")}
            className={`flex-1 py-3 text-center text-[15px] font-bold transition-colors ${
              activeTab === "feed"
                ? "text-brand-green border-b-2 border-brand-green"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Feed
          </button>
          <button
            onClick={() => setActiveTab("reflections")}
            className={`flex-1 py-3 text-center text-[15px] font-bold transition-colors ${
              activeTab === "reflections"
                ? "text-brand-green border-b-2 border-brand-green"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Reflections
          </button>
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
            key="feed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {activeTab === "reflections" ? (
              <div className="px-4 pt-4">
                <DailyReflectionPrompt responseCount={posts.filter(p => p.promptId).length} />
                <div className="mt-4">
                  {posts.filter(p => p.promptId).map((post, i) => (
                    <motion.div
                      key={post._id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.3 }}
                    >
                      <PostCard post={post} isHighlighted={true} />
                    </motion.div>
                  ))}
                  {posts.filter(p => p.promptId).length === 0 && (
                    <div className="bg-secondary/20 border border-border/30 rounded-2xl p-6 my-6 text-center">
                      <div className="w-12 h-12 bg-brand-green/10 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Sparkles className="w-5 h-5 text-brand-green" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Be the first to share your reflection
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {posts.filter(p => !p.promptId).map((post, i) => (
                  <motion.div
                    key={post._id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.3 }}
                  >
                    <PostCard post={post} />
                  </motion.div>
                ))}
              </>
            )}

            {/* End of Feed / Load More */}
            <div ref={observerTarget} className="h-4 w-full" />

            {loadingMore && (
              <div className="flex justify-center py-8">
                <RefreshCw className="w-5 h-5 animate-spin text-brand-green/40" aria-hidden="true" />
              </div>
            )}

            {!hasMore && posts.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="px-4 py-16 text-center space-y-3"
              >
                <div className="inline-flex justify-center items-center w-14 h-14 rounded-full bg-brand-green/10 border border-brand-green/20 text-brand-green mb-2">
                  <Sparkles className="w-6 h-6" aria-hidden="true" />
                </div>
                <h3 className="text-[17px] font-bold tracking-tight">
                  You&apos;re all caught up
                </h3>
                <p className="text-muted-foreground text-[14px] max-w-[240px] mx-auto">
                  You&apos;ve seen all recorded thoughts. Time to add your own.
                </p>
                <Link
                  href="/create"
                  className="inline-flex items-center gap-2 mt-2 px-6 py-2.5 text-white rounded-full font-bold text-[14px] bg-[#00a855] transition-colors shadow-brand-sm press-scale"
                >
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                  Share a Thought
                </Link>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 py-20 flex flex-col items-center justify-center space-y-5 text-center"
          >
            <div className="w-20 h-20 bg-brand-green/10 border border-brand-green/20 rounded-full flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-brand-green" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">The feed is empty</h3>
              <p className="text-muted-foreground text-[14px] max-w-[260px]">
                No thoughts have been shared yet. Be the trailblazer.
              </p>
            </div>
            <Link
              href="/create"
              className="px-8 py-3 text-white rounded-full font-bold text-[15px] bg-[#00a855] transition-colors shadow-brand-sm press-scale"
            >
              Post Your Thought
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom padding for mobile nav */}
      <div className="mobile-content-offset" />
    </>
  );
}
