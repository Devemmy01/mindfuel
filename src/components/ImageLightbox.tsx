"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X } from "lucide-react";

export default function ImageLightbox({
  src,
  alt,
  open,
  onClose,
}: {
  src: string;
  alt: string;
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose, open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 p-3 backdrop-blur-md sm:p-8"
      onClick={(event) => {
        event.stopPropagation();
        onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white transition hover:bg-white/15"
        aria-label="Close image preview"
      >
        <X className="h-6 w-6" />
      </button>
      <Image
        src={src}
        alt={alt}
        width={1600}
        height={1200}
        unoptimized={process.env.NODE_ENV === "development"}
        onClick={(event) => event.stopPropagation()}
        className="h-auto max-h-[calc(100dvh-2rem)] w-auto max-w-full select-none object-contain sm:max-h-[calc(100dvh-4rem)]"
        priority
      />
    </div>,
    document.body,
  );
}
