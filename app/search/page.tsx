"use client";

import React from "react";
import SearchUsers from "@/components/SearchUsers";
import TrendingHashtags from "@/components/TrendingHashtags";
import MessagesShortcut from "@/components/shell/MessagesShortcut";
import { copy } from "@/lib/copy";

export default function SearchPage() {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 z-sticky flex h-14 items-center justify-between border-b border-line bg-background/90 px-4 backdrop-blur-md">
        <h1 className="text-h3">{copy.nav.search}</h1>
        <MessagesShortcut className="-mr-2" />
      </header>
      <div className="max-w-full space-y-6 overflow-hidden p-4">
        <SearchUsers />
        <TrendingHashtags />
        <p className="px-4 text-center text-body-sm text-muted-foreground">
          Find people by name or @username, or browse a hashtag to read {copy.nounPlural} on a topic.
        </p>
      </div>

      {/* Bottom padding for mobile nav */}
      <div className="mobile-content-offset" />
    </div>
  );
}
