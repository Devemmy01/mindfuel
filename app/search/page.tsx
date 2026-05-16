"use client";

import React from "react";
import SearchUsers from "@/components/SearchUsers";
import TrendingHashtags from "@/components/TrendingHashtags";

export default function SearchPage() {
  return (
    <div className="flex flex-col w-full min-h-screen">
      <div className="p-4 max-w-full overflow-hidden space-y-6">
        <SearchUsers />

        <TrendingHashtags />

        {/* Placeholder / Search tips when empty */}
        <div className="px-4 text-center">
          <p className="text-muted-foreground text-[14px]">
            Search for fellow MindFuel users to see their reflections and
            thoughts.
          </p>
        </div>
      </div>

      {/* Bottom padding for mobile nav */}
      <div className="mobile-content-offset" />
    </div>
  );
}
