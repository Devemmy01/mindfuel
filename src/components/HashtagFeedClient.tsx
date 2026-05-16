"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Hash, ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import PostCard from "@/components/PostCard";
import { PostType } from "@/types";
import { useAuth } from "@/providers/AuthProvider";

interface HashtagFeedResponse {
  hashtag: {
    tag: string;
    displayTag: string;
    postCount: number;
    lastUsedAt?: string;
  };
  posts: PostType[];
  total: number;
  hasMore: boolean;
}

interface HashtagFeedClientProps {
  tag: string;
}

export default function HashtagFeedClient({ tag }: HashtagFeedClientProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [currentTag, setCurrentTag] = useState(tag.toLowerCase());
  const [posts, setPosts] = useState<PostType[]>([]);
  const [hashtag, setHashtag] = useState<HashtagFeedResponse["hashtag"] | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentTag(tag.toLowerCase());
  }, [tag]);

  useEffect(() => {
    let cancelled = false;

    const loadPage = async () => {
      setLoading(true);
      setPage(1);
      try {
        const userIdParam = user?.uid ? `&userId=${user.uid}` : "";
        const res = await fetch(`/api/hashtags/${encodeURIComponent(currentTag)}?page=1&limit=12${userIdParam}`);
        const data: HashtagFeedResponse = await res.json();

        if (cancelled) return;

        setPosts(data.posts || []);
        setHashtag(data.hashtag || null);
        setHasMore(Boolean(data.hasMore));
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load hashtag feed", error);
          setPosts([]);
          setHashtag({ tag: currentTag, displayTag: `#${currentTag}`, postCount: 0 });
          setHasMore(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPage();

    return () => {
      cancelled = true;
    };
  }, [currentTag, user?.uid]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || loadingMore) return;

    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const userIdParam = user?.uid ? `&userId=${user.uid}` : "";
      const res = await fetch(`/api/hashtags/${encodeURIComponent(currentTag)}?page=${nextPage}&limit=12${userIdParam}`);
      const data: HashtagFeedResponse = await res.json();
      setPosts((prev) => [...prev, ...(data.posts || [])]);
      setHasMore(Boolean(data.hasMore));
      setPage(nextPage);
      if (data.hashtag) setHashtag(data.hashtag);
    } catch (error) {
      console.error("Failed to load more hashtag posts", error);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loading, loadingMore, page, currentTag, user?.uid]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: "240px" }
    );

    const sentinel = sentinelRef.current;
    if (sentinel) observer.observe(sentinel);

    return () => observer.disconnect();
  }, [currentTag, hasMore, loading, loadingMore, page, user?.uid, loadMore]);

  const title = useMemo(() => hashtag?.displayTag || `#${currentTag}`, [hashtag, currentTag]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <div className="sticky top-0 z-20 glass-strong border-b border-border/60 px-4 py-3">
          <div className="h-5 w-40 rounded-full bg-secondary/40 animate-pulse" />
          <div className="h-3 w-28 rounded-full bg-secondary/30 animate-pulse mt-2" />
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-40 rounded-3xl bg-secondary/20 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-30 glass-strong border-b border-border/60 backdrop-blur-xl">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 -ml-1 rounded-full hover:bg-secondary/60 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-[20px] sm:text-[22px] font-black tracking-tight truncate">{title}</h1>
            <p className="text-[13px] text-muted-foreground">
              {hashtag?.postCount || 0} posts tagged with {title}
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 min-w-0">
        {posts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 py-20 flex flex-col items-center justify-center text-center space-y-4"
          >
            <div className="w-20 h-20 rounded-full bg-brand-green/10 flex items-center justify-center border border-brand-green/20">
              <Hash className="w-8 h-8 text-brand-green" />
            </div>
            <div className="space-y-2 max-w-sm">
              <h2 className="text-xl font-bold">Nothing here yet</h2>
              <p className="text-muted-foreground text-[14px]">
                Be the first to post with {title}. Thoughtful tags help others discover your reflections.
              </p>
            </div>
            <Link
              href="/create"
              className="px-6 py-3 rounded-full bg-brand-green text-white font-bold shadow-brand-sm"
            >
              Create a post
            </Link>
          </motion.div>
        ) : (
          <div>
            {posts.map((post) => (
              <PostCard key={post._id} post={post} />
            ))}

            <div className="py-14 flex flex-col items-center justify-center text-center">
              {loadingMore ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading more posts…</span>
                </div>
              ) : hasMore ? (
                <p className="text-sm text-muted-foreground">Scroll for more</p>
              ) : (
                <p className="text-sm text-muted-foreground">You&apos;ve reached the end</p>
              )}
            </div>
            <div ref={sentinelRef} className="h-8" />
          </div>
        )}
      </main>
    </div>
  );
}