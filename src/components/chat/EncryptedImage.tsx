"use client";

import React from "react";
import type { User } from "firebase/auth";
import { ImageOff, Loader2 } from "lucide-react";
import { chatFetch } from "@/lib/chat-api";
import { decryptChatBytes } from "@/lib/chat-crypto";
import type { ImageEnvelope } from "@/lib/chat-attachments";

// Decrypted photos live in memory only (never localStorage), for this tab's lifetime.
const decryptedUrls = new Map<string, Promise<string>>();

function loadPhoto(user: User, envelope: ImageEnvelope, getKey: () => Promise<CryptoKey | CryptoKey[]>) {
  let pending = decryptedUrls.get(envelope.id);
  if (!pending) {
    pending = (async () => {
      const response = await chatFetch(user, `/api/chat/attachments/${envelope.id}`);
      if (!response.ok) throw new Error(String(response.status));
      const plain = await decryptChatBytes(await getKey(), await response.arrayBuffer(), envelope.iv);
      return URL.createObjectURL(new Blob([plain], { type: envelope.mime }));
    })();
    pending.catch(() => decryptedUrls.delete(envelope.id));
    decryptedUrls.set(envelope.id, pending);
  }
  return pending;
}

/** A photo message: fetched as ciphertext, decrypted with the conversation key in this browser. */
export default function EncryptedImage({
  user,
  envelope,
  getKey,
}: {
  user: User;
  envelope: ImageEnvelope;
  getKey: () => Promise<CryptoKey | CryptoKey[]>;
}) {
  const [url, setUrl] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setFailed(false);
    loadPhoto(user, envelope, getKey)
      .then((value) => !cancelled && setUrl(value))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [user, envelope, getKey]);

  const ratio = `${envelope.w} / ${envelope.h}`;
  const alt = envelope.caption ? `Photo: ${envelope.caption}` : "Photo";

  if (failed) {
    return (
      <span className="flex w-56 max-w-full items-center justify-center gap-2 rounded-md bg-foreground/5 text-caption text-muted-foreground" style={{ aspectRatio: ratio }}>
        <ImageOff className="size-4" aria-hidden /> Photo unavailable
      </span>
    );
  }
  if (!url) {
    return (
      <span className="flex w-56 max-w-full items-center justify-center rounded-md bg-foreground/5" style={{ aspectRatio: ratio }} role="img" aria-label="Loading photo">
        <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
      </span>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      onClick={(event) => event.stopPropagation()}
      className="block overflow-hidden rounded-md"
      aria-label={`Open ${alt.toLowerCase()} full size`}
    >
      {/* A decrypted blob URL; next/image can't optimise it. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={alt} width={envelope.w} height={envelope.h} className="h-auto max-h-80 w-auto max-w-full object-contain" style={{ aspectRatio: ratio }} />
    </a>
  );
}
