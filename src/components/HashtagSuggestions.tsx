"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hash, TrendingUp } from "lucide-react";

export interface HashtagSuggestionItem {
  tag: string;
  displayTag?: string;
  postCount?: number;
  score?: number;
}

interface HashtagSuggestionsProps {
  open: boolean;
  query: string;
  suggestions: HashtagSuggestionItem[];
  activeIndex: number;
  loading?: boolean;
  onSelect: (tag: string) => void;
  onHoverIndex: (index: number) => void;
  recentTags?: string[];
  id?: string;
}

export default function HashtagSuggestions({
  open,
  query,
  suggestions,
  activeIndex,
  loading,
  onSelect,
  onHoverIndex,
  recentTags = [],
  id,
}: HashtagSuggestionsProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.16 }}
          className="absolute left-0 right-0 top-full mt-2 z-40 rounded-2xl border border-border/70 bg-popover popover-solid shadow-2xl overflow-hidden"
          role="listbox"
          aria-label="Hashtag suggestions"
          id={id}
        >
          <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Hash className="w-4 h-4 text-brand-green shrink-0" />
              <div className="min-w-0">
                <p className="text-[13px] font-bold truncate">
                  {query ? `Suggestions for #${query}` : "Trending hashtags"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  Use arrow keys to navigate and Enter to insert
                </p>
              </div>
            </div>
            {recentTags.length > 0 && (
              <span className="text-[11px] font-semibold text-brand-green bg-brand-green/10 px-2 py-0.5 rounded-full shrink-0">
                Recent
              </span>
            )}
          </div>

          {loading ? (
            <div className="p-3 space-y-2">
              {[1, 2, 3].map((index) => (
                <div key={index} className="h-12 rounded-xl bg-secondary/40 animate-pulse" />
              ))}
            </div>
          ) : suggestions.length > 0 ? (
            <div className="max-h-[280px] overflow-y-auto thin-scrollbar py-2">
              {suggestions.map((suggestion, index) => {
                const isActive = index === activeIndex;
                const label = suggestion.displayTag || `#${suggestion.tag}`;

                return (
                  <button
                    key={suggestion.tag}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onMouseEnter={() => onHoverIndex(index)}
                    onClick={() => onSelect(suggestion.tag)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                      isActive ? "bg-brand-green/10" : "hover:bg-secondary/60"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-brand-green/10 flex items-center justify-center shrink-0">
                      <Hash className="w-4 h-4 text-brand-green" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-[14px] truncate">{label}</span>
                        {recentTags.includes(suggestion.tag) && (
                          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                            Recent
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>{suggestion.postCount || 0} posts</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-5 text-center">
              <p className="text-[13px] text-muted-foreground">No hashtags found for &quot;#{query}&quot;</p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}