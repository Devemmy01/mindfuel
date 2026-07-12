"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, User, Loader2, Hash, TrendingUp } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { hashtagTextToPath, normalizeHashtag } from "@/lib/hashtags-core";

interface UserResult {
  _id: string;
  name: string;
  image: string;
  firebaseId: string;
  username?: string;
}

interface HashtagResult {
  tag: string;
  displayTag: string;
  postCount: number;
}

type SearchResult =
  | { kind: "user"; data: UserResult }
  | { kind: "hashtag"; data: HashtagResult };

export default function SearchUsers() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setShowResults(false);
    setQuery("");
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const trimmedQuery = query.trim();
      const isHashtagSearch = trimmedQuery.startsWith("#");
      const hashtagQuery = normalizeHashtag(trimmedQuery);

      if (isHashtagSearch) {
        setLoading(true);
        try {
          const endpoint = hashtagQuery.length > 0
            ? `/api/hashtags/search?q=${encodeURIComponent(hashtagQuery)}&limit=6`
            : "/api/hashtags/trending?limit=6";
          const res = await fetch(endpoint);
          const data = await res.json();
          const hashtags = (data.hashtags || []).map((item: HashtagResult) => ({
            kind: "hashtag" as const,
            data: {
              tag: item.tag,
              displayTag: item.displayTag || `#${item.tag}`,
              postCount: item.postCount || 0,
            },
          }));

          setResults(hashtags);
          setShowResults(true);
        } catch (err) {
          console.error("Hashtag search failed", err);
        } finally {
          setLoading(false);
        }
        return;
      }

      if (trimmedQuery.length >= 2) {
        setLoading(true);
        try {
          const res = await fetch(`/api/users/search?q=${encodeURIComponent(trimmedQuery)}`);
          const data = await res.json();
          setResults((data.users || []).map((user: UserResult) => ({ kind: "user", data: user })));
          setShowResults(true);
        } catch (err) {
          console.error("Search failed", err);
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative w-full mb-6" ref={searchRef} role="combobox" aria-expanded={showResults} aria-haspopup="listbox" aria-controls="search-results">
      <label htmlFor="search-users" className="sr-only">Search MindFuel</label>
      <div className="frosted-input px-4 h-[46px] flex items-center gap-3 transition-all focus-within:ring-2 focus-within:ring-brand-green/30">
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
        <input
          id="search-users"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => (query.trim().length >= 2 || query.trim().startsWith("#")) && setShowResults(true)}
          placeholder="Search MindFuel"
          aria-autocomplete="list"
          className="bg-transparent border-none outline-none text-[14px] placeholder:text-muted-foreground border w-full"
        />
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-green" aria-hidden="true" />}
      </div>

      {showResults && (
        <div id="search-results" role="listbox" className="absolute top-full mt-2 w-full bg-popover popover-solid border border-border rounded-2xl shadow-card overflow-hidden z-50 animate-scale-in">
          {results.length > 0 ? (
            <div className="flex flex-col py-1">
              {results.map((result) =>
                result.kind === "user" ? (
                  <Link
                    key={result.data._id}
                    href={`/profile/${result.data.firebaseId}`}
                    role="option"
                    className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/60 transition-colors"
                  >
                    {result.data.image ? (
                      <Image src={result.data.image} width={36} height={36} className="w-9 h-9 rounded-full object-cover" alt="" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-[14px] leading-tight truncate">{result.data.name}</span>
                      <span className="text-[12px] text-muted-foreground truncate">
                        @{result.data.username || (result.data.name.replace(/\s+/g, "").toLowerCase())}
                      </span>
                    </div>
                  </Link>
                ) : (
                  <Link
                    key={result.data.tag}
                    href={hashtagTextToPath(result.data.tag)}
                    role="option"
                    className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/60 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-brand-green/10 flex items-center justify-center shrink-0">
                      <Hash className="w-4 h-4 text-brand-green" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-bold text-[14px] leading-tight truncate">{result.data.displayTag}</span>
                      <span className="text-[12px] text-muted-foreground truncate flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        {result.data.postCount} posts
                      </span>
                    </div>
                  </Link>
                )
              )}
            </div>
          ) : (
            <div className="px-4 py-4 text-center">
              <p className="text-[13px] text-muted-foreground">
                {query.trim().startsWith("#")
                  ? `No hashtags found for "${query}"`
                  : `No users found for "${query}"`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
