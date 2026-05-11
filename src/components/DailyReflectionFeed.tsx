"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PostCard from "./PostCard";
import { PostType } from "@/types";
import { Flame } from "lucide-react";

interface DailyReflectionFeedProps {
  allPosts: PostType[];
  onPostsChange?: (posts: PostType[]) => void;
}

export default function DailyReflectionFeed({
  allPosts,
  onPostsChange,
}: DailyReflectionFeedProps) {
  const [todayResponses, setTodayResponses] = useState<PostType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching responses to today's prompt
    // In a real app, this would filter posts tagged with today's prompt
    // For now, we'll show a selection of recent trending posts as "responses"
    try {

      // Get top 3-5 posts (would be filtered by prompt ID in real implementation)
      const responses = allPosts
        .slice(0, 5)
        .sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));

      setTodayResponses(responses);
      onPostsChange?.(responses);
    } catch (err) {
      console.error("Failed to get today's responses", err);
    } finally {
      setIsLoading(false);
    }
  }, [allPosts, onPostsChange]);

  if (isLoading) {
    return (
      <div className="mb-8 space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-secondary/30 rounded-xl h-32 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (todayResponses.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-secondary/20 border border-border/30 rounded-2xl p-6 mb-6 text-center"
      >
        <div className="w-12 h-12 bg-brand-green/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <div className="w-5 h-5 rounded-full bg-brand-green/50" />
        </div>
        <p className="text-sm text-muted-foreground">
          Be the first to share your reflection
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mb-2"
    >
      {/* Section header */}
      <div className="px-4 py-3 flex items-center gap-2">
        <Flame className="w-5 h-5 text-orange-500" />
        <h3 className="text-[15px] font-bold text-foreground">
          Top Reflections Today
        </h3>
        <div className="flex-1" />
        <span className="text-xs font-medium text-muted-foreground">
          {todayResponses.length} shared
        </span>
      </div>

      {/* Posts */}
      <AnimatePresence>
        {todayResponses.map((post, i) => (
          <motion.div
            key={post._id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10px" }}
            transition={{ 
              delay: i * 0.05, 
              duration: 0.4,
              ease: [0.21, 0.47, 0.32, 0.98]
            }}
          >
            <PostCard post={post} isHighlighted={true} />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/30" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 text-xs text-muted-foreground bg-background">
            More reflections below
          </span>
        </div>
      </div>
    </motion.div>
  );
}
