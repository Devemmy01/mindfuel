"use client";

import React, { useEffect, useState } from "react";
import { Hash, Search, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import HashtagSuggestions, { HashtagSuggestionItem } from "@/components/HashtagSuggestions";

export default function HashtagSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<HashtagSuggestionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const cleanedQuery = query.replace(/^#/, "").trim();
      if (!cleanedQuery) {
        setSuggestions([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/hashtags/search?q=${encodeURIComponent(cleanedQuery)}&limit=8`);
        const data = await res.json();
        setSuggestions(data.hashtags || []);
      } catch (error) {
        console.error("Failed to search hashtags", error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => window.clearTimeout(timer);
  }, [query]);

  const navigateToHashtag = (tag: string) => {
    router.push(`/hashtags/${encodeURIComponent(tag)}`);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      navigateToHashtag(suggestions[activeIndex]?.tag || suggestions[0].tag);
    } else if (event.key === "Escape") {
      setSuggestions([]);
    }
  };

  return (
    <div
      className="relative w-full"
      role="combobox"
      aria-expanded={suggestions.length > 0}
      aria-haspopup="listbox"
      aria-controls="hashtag-suggestions-list"
    >
      <div className="frosted-input px-4 h-[46px] flex items-center gap-3 transition-all focus-within:ring-2 focus-within:ring-brand-green/30">
        <Hash className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search hashtags"
          aria-label="Search hashtags"
          className="bg-transparent border-none outline-none text-[14px] placeholder:text-muted-foreground w-full"
        />
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-green" aria-hidden="true" /> : <Search className="w-4 h-4 text-muted-foreground" aria-hidden="true" />}
      </div>

      <HashtagSuggestions
        open={Boolean(query.trim())}
        query={query.replace(/^#/, "").trim()}
        suggestions={suggestions}
        activeIndex={activeIndex}
        loading={loading}
        onSelect={navigateToHashtag}
        id="hashtag-suggestions-list"
        onHoverIndex={setActiveIndex}
      />
    </div>
  );
}