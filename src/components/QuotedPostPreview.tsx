"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getFontById } from "@/lib/fonts";
import { PostType } from "@/types";
import HashtagText from "@/components/HashtagText";
import ImageLightbox from "@/components/ImageLightbox";

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
  const [isImageOpen, setIsImageOpen] = useState(false);
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
        className={`px-3 py-3 m-2 mt-1 rounded-xl text-[14px] leading-relaxed bg-secondary/30 ${
          post.imageUrl ? "mb-2" : ""
        }`}
        style={{
          fontFamily: getFontById(post.fontFamily ?? "inter").family,
        }}
      >
        <p className="line-clamp-3 text-foreground/90">
          <HashtagText text={post.text} />
        </p>
      </div>
      {post.imageUrl && (
        <button
          type="button"
          className="mx-2 mb-2 block w-[calc(100%-1rem)] cursor-zoom-in overflow-hidden rounded-xl border border-border/50 bg-secondary/20"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setIsImageOpen(true);
          }}
          aria-label="View quoted thought image"
        >
          <Image
            src={post.imageUrl}
            alt={`Image attached to ${post.userId.name}'s thought`}
            width={720}
            height={480}
            unoptimized={process.env.NODE_ENV === "development"}
            className="h-auto max-h-[320px] w-full object-contain transition-transform duration-300 group-hover/quote:scale-[1.01]"
          />
        </button>
      )}
      {post.imageUrl && (
        <ImageLightbox
          src={post.imageUrl}
          alt={`Image attached to ${post.userId.name}'s thought`}
          open={isImageOpen}
          onClose={() => setIsImageOpen(false)}
        />
      )}
    </div>
  );
};

export default QuotedPostPreview;
