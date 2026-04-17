"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, User, Loader2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface UserResult {
  _id: string;
  name: string;
  image: string;
  firebaseId: string;
  username?: string;
}

export default function SearchUsers() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
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
      if (query.length >= 2) {
        setLoading(true);
        try {
          const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
          const data = await res.json();
          setResults(data.users || []);
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
          onFocus={() => query.length >= 2 && setShowResults(true)}
          placeholder="Search MindFuel"
          aria-autocomplete="list"
          className="bg-transparent border-none outline-none text-[14px] placeholder:text-muted-foreground w-full"
        />
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-green" aria-hidden="true" />}
      </div>

      {showResults && (
        <div id="search-results" role="listbox" className="absolute top-full mt-2 w-full bg-popover popover-solid border border-border rounded-2xl shadow-card overflow-hidden z-50 animate-scale-in">
          {results.length > 0 ? (
            <div className="flex flex-col py-1">
              {results.map((u) => (
                <Link
                  key={u._id}
                  href={`/profile/${u.firebaseId}`}
                  role="option"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/60 transition-colors"
                >
                  {u.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={u.image} className="w-9 h-9 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-[14px] leading-tight truncate">{u.name}</span>
                      <span className="text-[12px] text-muted-foreground truncate">
                        @{u.username || (u.name.replace(/\s+/g, "").toLowerCase())}
                      </span>
                    </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-4 py-4 text-center">
              <p className="text-[13px] text-muted-foreground">No users found for &quot;{query}&quot;</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
