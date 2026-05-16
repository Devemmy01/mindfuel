"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Hash, TrendingUp } from "lucide-react";
import { hashtagTextToPath } from "@/lib/hashtags-core";

export interface TrendingHashtagItem {
  tag: string;
  displayTag?: string;
  postCount: number;
  trendScore?: number;
}

interface TrendingHashtagsProps {
  limit?: number;
  compact?: boolean;
}

export default function TrendingHashtags({ limit = 8, compact = false }: TrendingHashtagsProps) {
  const [hashtags, setHashtags] = useState<TrendingHashtagItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const loadHashtags = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/hashtags/trending?limit=${limit}`, { signal: controller.signal });
        const data = await res.json();
        setHashtags(data.hashtags || []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Failed to load trending hashtags", error);
        }
      } finally {
        setLoading(false);
      }
    };

    loadHashtags();

    return () => controller.abort();
  }, [limit]);

  if (loading) {
    return (
      <div className={`rounded-3xl border border-border/60 bg-card/60 p-4 ${compact ? "" : "shadow-card"}`}>
        <div className="h-4 w-32 rounded-full bg-secondary/40 animate-pulse mb-4" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-11 rounded-2xl bg-secondary/30 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (hashtags.length === 0) {
    return (
      <div className="rounded-3xl border border-border/60 bg-card/60 p-4 shadow-card">
        <h3 className="text-[13px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-2">
          Trending Hashtags
        </h3>
        <p className="text-sm text-muted-foreground">No trending hashtags yet. Start the conversation.</p>
      </div>
    );
  }

  return (
    <div className={`rounded-3xl border border-border/60 bg-card/60 p-4 ${compact ? "" : "shadow-card"}`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-[13px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Trending Hashtags
        </h3>
        <TrendingUp className="w-4 h-4 text-brand-green" />
      </div>

      <div className="space-y-2">
        {hashtags.map((hashtag) => (
          <Link
            key={hashtag.tag}
            href={hashtagTextToPath(hashtag.tag)}
            className="flex items-center gap-3 rounded-2xl border border-border/40 px-3 py-2.5 hover:bg-secondary/50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-brand-green/10 flex items-center justify-center shrink-0">
              <Hash className="w-4 h-4 text-brand-green" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-[14px] truncate">#{hashtag.tag}</p>
              <p className="text-[12px] text-muted-foreground">{hashtag.postCount} posts</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}