"use client";

import React from "react";
import { PencilLine, ArrowRight, RefreshCw, Download } from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import { cn } from "@/lib/utils";

const fallbackTip = "Breathe deeply. You are exactly where you need to be.";

async function fetchTip(url: string): Promise<{ text: string }> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch tip");
  return response.json();
}

export default function MindfulTip({ className }: { className?: string }) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    "/api/tips/random",
    fetchTip,
    {
      dedupingInterval: 60_000,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
      onError: (tipError) => console.error("Failed to fetch tip:", tipError),
    },
  );
  const loading = isLoading || isValidating;
  const tip = data?.text || (error ? fallbackTip : "Loading your mindful tip...");

  return (
    <div className={cn(
      "bg-brand-green/5 rounded-3xl p-5 border border-brand-green/10 mt-6 group hover:bg-brand-green/10 transition-all cursor-default",
      className,
    )}>
      <div className="flex items-center gap-2 mb-3">
        <PencilLine className="w-4 h-4 text-brand-green" />
        <h3 className="font-extrabold text-[12px] uppercase tracking-[0.1em] text-brand-green/80">Mindful Tip</h3>
      </div>
      <p className="text-[14px] font-medium leading-relaxed text-foreground/90 italic">
        &quot;{tip}&quot;
      </p>
      <div className="mt-6 flex items-center justify-between">
        <button 
          onClick={() => void mutate()}
          disabled={loading}
          aria-label="Get a new mindful tip"
          className="flex items-center gap-2 text-[12px] font-bold text-brand-green hover:underline decoration-2 underline-offset-4 tracking-tight disabled:opacity-50"
        >
          Stay intentional {loading ? <RefreshCw className="w-3 h-3 animate-spin" aria-hidden="true" /> : <ArrowRight className="w-3 h-3" aria-hidden="true" />}
        </button>

        {!loading && (
          <Link 
            href={`/tip/download?text=${encodeURIComponent(tip)}`}
            className="p-2 rounded-full bg-brand-green/10 text-brand-green hover:bg-brand-green/20 transition-colors"
            title="Download as image"
          >
            <Download className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}
