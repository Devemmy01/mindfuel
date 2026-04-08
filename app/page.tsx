"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useState, useCallback, useRef } from "react";
import PostCard from "@/components/PostCard";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, RefreshCw } from "lucide-react";
import Link from "next/link";
import { PostType } from "@/types";



// Skeleton card
function SkeletonCard() {
  return (
    <div className="flex px-4 py-4 border-b border-border gap-3">
      <div className="skeleton w-10 h-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="skeleton h-3 w-32 rounded-full" />
        <div className="skeleton h-24 rounded-2xl w-full" />
        <div className="flex gap-6 mt-2">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-3 w-8 rounded-full" />)}
        </div>
      </div>
    </div>
  );
}



export default function Home() {

  const [posts, setPosts] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const currentPageRef = useRef(1);
  const [hasMore, setHasMore] = useState(true);
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
      const res = await fetch(`/api/posts?page=${pageNum}&limit=10`);
      const data = await res.json();
      
      if (pageNum === 1) {
        setPosts(data.posts || []);
      } else {
        setPosts(prev => [...prev, ...(data.posts || [])]);
      }
      
      setHasMore(data.hasMore);
    } catch (err) {
      console.error("Failed to fetch posts", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    const currentTarget = observerTarget.current;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          const next = ++currentPageRef.current;
          fetchPosts(false, next);
        }
      },
      { threshold: 0.1 }
    );

    if (currentTarget) observer.observe(currentTarget);
    return () => { if (currentTarget) observer.unobserve(currentTarget); };
  }, [hasMore, loading, loadingMore, fetchPosts]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  return (
    <div className="flex flex-col w-full min-h-screen">

      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-40 glass-strong border-b border-border/60">

        {/* Mobile top bar */}
        <div className="flex md:hidden justify-between items-center px-4 py-2.5">
          <div className="w-8 h-8 rounded-full overflow-hidden">
            <img src="/logoDarkbg.png" alt="MindFuel" className="w-full h-full object-cover" />
          </div>
          <span className="font-bold text-[17px] tracking-tight">MindFuel</span>
          <button
            onClick={() => fetchPosts(true)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary/60 transition-colors press-scale"
          >
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      {/* ── Feed ── */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
          </motion.div>
        ) : posts.length > 0 ? (
          <motion.div key="feed" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {posts.map((post, i) => (
              <motion.div
                key={post._id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
              >
                <PostCard post={post} />
              </motion.div>
            ))}

            {/* End of Feed / Load More */}
            <div ref={observerTarget} className="h-4 w-full" />
            
            {loadingMore && (
              <div className="flex justify-center py-8">
                <RefreshCw className="w-5 h-5 animate-spin text-brand-green/40" />
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
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-[17px] font-bold tracking-tight">You&apos;re all caught up</h3>
                <p className="text-muted-foreground text-[14px] max-w-[240px] mx-auto">
                  You&apos;ve seen all recorded thoughts. Time to add your own.
                </p>
                <Link
                  href="/create"
                  className="inline-flex items-center gap-2 mt-2 px-6 py-2.5 text-white rounded-full font-bold text-[14px] bg-[#00a855] transition-colors shadow-brand-sm press-scale"
                >
                  <Sparkles className="w-4 h-4" />
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
              <Sparkles className="w-8 h-8 text-brand-green" />
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
    </div>
  );
}
