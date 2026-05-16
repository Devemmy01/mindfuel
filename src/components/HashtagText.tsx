"use client";

import React from "react";
import Link from "next/link";
import { hashtagTextToPath, normalizeHashtag } from "@/lib/hashtags-core";

interface HashtagTextProps {
  text: string;
  className?: string;
  onHashtagClick?: () => void;
}

const HASHTAG_TOKEN = /#[A-Za-z0-9_]{1,50}\b/g;

export default function HashtagText({ text, className = "", onHashtagClick }: HashtagTextProps) {
  const tokens = text.split(HASHTAG_TOKEN);
  const matches = text.match(HASHTAG_TOKEN) || [];

  const nodes: React.ReactNode[] = [];

  tokens.forEach((token, index) => {
    if (token) {
      nodes.push(<React.Fragment key={`text-${index}`}>{token}</React.Fragment>);
    }

    const hashtag = matches[index];
    if (hashtag) {
      const normalized = normalizeHashtag(hashtag);
      nodes.push(
        <Link
          key={`hashtag-${normalized}-${index}`}
          href={hashtagTextToPath(normalized)}
          onClick={(e) => {
            e.stopPropagation();
            onHashtagClick?.();
          }}
          className="font-semibold text-[#00a855] hover:text-[#00914a] hover:underline break-words"
        >
          #{normalized}
        </Link>
      );
    }
  });

  return <span className={className}>{nodes}</span>;
}