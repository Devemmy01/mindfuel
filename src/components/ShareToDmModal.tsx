"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Loader2, Search, Send, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { usePresence } from "@/providers/PresenceProvider";
import { getUserHandle } from "@/lib/userHandle";

type Recipient = {
  _id: string;
  firebaseId: string;
  name: string;
  username?: string;
  image?: string;
};

export default function ShareToDmModal({
  open,
  onClose,
  postId,
  authorName,
}: {
  open: boolean;
  onClose: () => void;
  postId: string;
  authorName: string;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(false);
  const isOnline = usePresence(results.map((recipient) => recipient.firebaseId));

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setLoading(false);
      return;
    }
    const search = query.trim();
    if (search.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(search)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Search failed");
        const data = await response.json();
        setResults((data.users || []).filter((recipient: Recipient) => recipient.firebaseId !== user?.uid));
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, query, user?.uid]);

  if (!open) return null;

  const chooseRecipient = (recipient: Recipient) => {
    const postUrl = `${window.location.origin}/post/${postId}`;
    const params = new URLSearchParams({
      with: recipient.firebaseId,
      draft: `Thought from ${authorName}:\n${postUrl}`,
    });
    onClose();
    router.push(`/messages?${params.toString()}`);
  };

  return (
    <div
      className="fixed inset-0 z-[240] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="modal-solid flex max-h-[72vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-border shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-to-dm-title"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 id="share-to-dm-title" className="text-lg font-bold">Send thought via DM</h2>
            <p className="text-xs text-muted-foreground">Choose who you want to share it with.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-secondary" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4">
          <label className="flex items-center gap-2 rounded-full bg-secondary/50 px-4 ring-1 ring-border focus-within:ring-brand-green/60">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search people"
              className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {loading && <Loader2 className="h-4 w-4 animate-spin text-brand-green" />}
          </label>
        </div>
        <div className="thin-scrollbar min-h-48 overflow-y-auto border-t border-border">
          {query.trim().length < 2 ? (
            <p className="px-6 py-16 text-center text-sm text-muted-foreground">Type at least two characters to find someone.</p>
          ) : !loading && results.length === 0 ? (
            <p className="px-6 py-16 text-center text-sm text-muted-foreground">No people found.</p>
          ) : results.map((recipient) => (
            <button
              key={recipient._id}
              type="button"
              onClick={() => chooseRecipient(recipient)}
              className="flex w-full items-center gap-3 border-b border-border px-5 py-3.5 text-left transition-colors hover:bg-secondary/50"
            >
              <span className="relative shrink-0">
                {recipient.image && !recipient.image.startsWith("#") ? (
                  <Image src={recipient.image} alt="" width={44} height={44} className="h-11 w-11 rounded-full object-cover" />
                ) : (
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
                    <UserRound className="h-5 w-5" />
                  </span>
                )}
                <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${isOnline(recipient.firebaseId) ? "bg-[#35d07f]" : "bg-[#5f6b65]"}`} />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-sm">{recipient.name}</strong>
                <span className="block truncate text-xs text-muted-foreground">
                  @{getUserHandle(recipient)} · {isOnline(recipient.firebaseId) ? "Online" : "Offline"}
                </span>
              </span>
              <Send className="h-4 w-4 text-brand-green" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
