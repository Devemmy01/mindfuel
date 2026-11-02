"use client";

import React from "react";
import { ArrowRight, Download, RefreshCw, Sparkles, X } from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import IconButton from "@/components/ui/IconButton";

const fallbackTip = "Breathe deeply. You are exactly where you need to be.";
const GUEST_HIDDEN_KEY = "mindfuel:tips-hidden";

async function fetchTip(url: string): Promise<{ text: string }> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch tip");
  return response.json();
}

/** A screened, optional tip card. Members can hide it; the choice is saved to their profile. */
export default function MindfulTip({ className }: { className?: string }) {
  const { user, profile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [guestHidden, setGuestHidden] = React.useState(false);
  const [hiddenNow, setHiddenNow] = React.useState(false);

  React.useEffect(() => {
    try {
      setGuestHidden(localStorage.getItem(GUEST_HIDDEN_KEY) === "1");
    } catch {
      setGuestHidden(false);
    }
  }, []);

  const hidden = hiddenNow || (user ? profile?.showTips === false : guestHidden);
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    hidden ? null : "/api/tips/random",
    fetchTip,
    {
      dedupingInterval: 60_000,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    },
  );

  if (hidden) return null;

  const loading = isLoading || isValidating;
  const tip = data?.text || (error ? fallbackTip : "");

  const hide = async () => {
    setHiddenNow(true);
    if (user) {
      await fetch("/api/users/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showTips: false }),
      }).catch(() => undefined);
      void refreshProfile();
      showToast("Tips hidden. Turn them back on in Settings → Notifications.", "info", 5000);
    } else {
      try {
        localStorage.setItem(GUEST_HIDDEN_KEY, "1");
      } catch {
        // Hidden for this visit only.
      }
      showToast("Tips hidden.", "info");
    }
  };

  return (
    <section aria-labelledby="mindful-tip-title" className={cn("rounded-card border border-line bg-surface p-4", className)}>
      <div className="flex items-start justify-between gap-2">
        <h2 id="mindful-tip-title" className="flex items-center gap-1.5 text-micro font-semibold uppercase tracking-wider text-primary-text">
          <Sparkles className="size-3.5" aria-hidden /> Mindful tip
        </h2>
        <IconButton aria-label="Hide tips" size="sm" onClick={() => void hide()} className="-mr-2 -mt-2">
          <X className="size-4" />
        </IconButton>
      </div>
      <p className="mt-2 min-h-11 text-body-sm italic text-foreground/90" aria-live="polite">
        {tip ? <>&ldquo;{tip}&rdquo;</> : <span className="skeleton inline-block h-4 w-4/5" aria-hidden />}
      </p>
      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => void mutate()}
          disabled={loading}
          aria-label="Show another tip"
          className="inline-flex h-9 items-center gap-1.5 rounded-control text-caption font-semibold text-primary-text hover:underline disabled:opacity-50"
        >
          Another tip {loading ? <RefreshCw className="size-3 animate-spin" aria-hidden /> : <ArrowRight className="size-3" aria-hidden />}
        </button>
        {tip ? (
          <Link
            href={`/tip/download?text=${encodeURIComponent(tip)}`}
            aria-label="Download this tip as an image"
            className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Download className="size-4" aria-hidden />
          </Link>
        ) : null}
      </div>
    </section>
  );
}
