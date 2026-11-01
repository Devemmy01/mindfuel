"use client";

import React from "react";
import Link from "next/link";
import { PenLine } from "lucide-react";
import { getTodayPrompt, type DailyPrompt } from "@/lib/dailyPrompts";
import { copy } from "@/lib/copy";

export function composeHref(prompt: Pick<DailyPrompt, "id" | "question">) {
  return `/create?prompt=${encodeURIComponent(prompt.question)}&promptId=${prompt.id}`;
}

/** Compact "today's prompt" summary for the right rail. */
export default function TodayPromptCard() {
  // Resolved after mount: "today" depends on the viewer's clock, not the server's.
  const [prompt, setPrompt] = React.useState<DailyPrompt | null>(null);
  React.useEffect(() => setPrompt(getTodayPrompt()), []);

  return (
    <section aria-labelledby="rail-prompt-title" className="rounded-card border border-line bg-surface p-4">
      <h2 id="rail-prompt-title" className="text-micro font-semibold uppercase tracking-wider text-primary-text">
        Today&apos;s prompt
      </h2>
      <p className="mt-2 min-h-12 text-body font-semibold text-foreground">
        {prompt ? prompt.question : <span className="skeleton inline-block h-5 w-4/5" aria-hidden />}
      </p>
      {prompt ? (
        <Link
          href={composeHref(prompt)}
          className="mt-3 inline-flex h-9 items-center gap-2 rounded-control border border-line bg-surface-elevated px-3 text-caption font-semibold text-foreground transition-colors hover:border-line-strong"
        >
          <PenLine className="size-4" aria-hidden />
          {copy.prompt.cta}
        </Link>
      ) : null}
    </section>
  );
}
