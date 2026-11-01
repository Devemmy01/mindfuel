"use client";

import Image from "next/image";
import React from "react";
import { cn } from "@/lib/utils";

const SIZES = { xs: 24, sm: 32, md: 40, lg: 56, xl: 88 } as const;

type AvatarProps = {
  src?: string | null;
  name?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
  /** Decorative avatars next to a visible name should not be announced twice. */
  decorative?: boolean;
};

function initials(name?: string | null) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] || "?").toUpperCase() + (parts[1]?.[0] || "").toUpperCase();
}

/** Fixed-size avatar: the box is reserved before the image loads, so no layout shift. */
export default function Avatar({ src, name, size = "md", className, decorative = true }: AvatarProps) {
  const [failed, setFailed] = React.useState(false);
  const pixels = SIZES[size];
  const showImage = Boolean(src) && !failed;
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-surface-elevated font-semibold text-muted-foreground ring-1 ring-line",
        className,
      )}
      style={{ width: pixels, height: pixels, fontSize: Math.max(10, Math.round(pixels * 0.38)) }}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : name || "User"}
      aria-hidden={decorative || undefined}
    >
      {showImage ? (
        <Image
          src={src as string}
          alt=""
          width={pixels}
          height={pixels}
          sizes={`${pixels}px`}
          // Uploaded avatars can be data/blob URLs, which the optimizer rejects.
          unoptimized={/^(data|blob):/.test(src as string)}
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}
