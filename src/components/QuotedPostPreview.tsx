"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getFontById } from "@/lib/fonts";
import { PostType } from "@/types";

interface QuotedPostPreviewProps {
  post?: PostType | null;
  /** If provided, clicking the preview will navigate to the post */
  isClickable?: boolean;
}

const QuotedPostPreview: React.FC<QuotedPostPreviewProps> = ({
  post,
  isClickable = true,
}) => {
  const router = useRouter();
  if (!post || !post.userId) {
    return (
      <div className="border border-border/60 rounded-2xl p-4 bg-secondary/10 mb-3">
        <p className="text-muted-foreground text-[14px] italic">
          This post is not available
        </p>
      </div>
    );
  }

  const handleClick = (e: React.MouseEvent) => {
    if (!isClickable) return;
    e.stopPropagation();
    router.push(`/post/${post._id}`);
  };

  return (
    <div
      className={`border border-border/60 rounded-2xl overflow-hidden transition-colors mb-3 ${
        isClickable ? "hover:border-border cursor-pointer group/quote" : ""
      }`}
      onClick={handleClick}
    >
      <div className="flex items-center gap-1.5 p-3 pb-1">
        {post.userId.image && (
          <Image
            src={post.userId.image}
            alt={post.userId.name}
            width={32}
            height={32}
            className="rounded-full ring-1 ring-border/50"
          />
        )}
        <div className="flex flex-col">
          <span
            className={`font-bold text-[12px] ${isClickable ? "group-hover/quote:underline" : ""}`}
          >
            {post.userId.name}
          </span>
          <span className="text-muted-foreground text-[11px]">
            @
            {post.userId.username ||
              (post.userId.name || "").replace(/\s/g, "").toLowerCase()}
          </span>
        </div>
      </div>
      <div
        className="px-3 py-3 m-2 mt-1 rounded-xl text-[14px] leading-relaxed"
        style={{
          background: post.backgroundStyle?.value || "#0a0a0a",
          color: post.backgroundStyle?.text || "#ffffff",
          fontFamily: getFontById(post.fontFamily ?? "inter").family,
        }}
      >
        <p className="line-clamp-3">{post.text}</p>
      </div>
    </div>
  );
};

export default QuotedPostPreview;
