"use client";

import React from "react";
import Link from "next/link";
import useSWR from "swr";
import { formatDistanceToNowStrict, isToday } from "date-fns";
import { Flame, PenLine } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import QuickComposer from "@/components/home/QuickComposer";
import WeekStrip from "@/components/reflect/WeekStrip";
import { Card } from "@/components/ui/Card";
import { buttonVariants } from "@/components/ui/button";
import type { DailyPrompt } from "@/lib/dailyPrompts";
import { useTodayPrompt } from "@/hooks/useTodayPrompt";
import { composeHref } from "@/lib/links";
import { cn } from "@/lib/utils";
import type { ReflectionSaved } from "@/hooks/useSubmitReflection";

const COACHMARK_PENDING_KEY = "mindfuel:coachmark:pending";

type RecentPosts = { posts: Array<{ createdAt: string; isRepost?: boolean }> };

/**
 * The top of Home for members: today's prompt ready to answer, or, once they
 * have reflected today, their streak and week at a glance.
 */
export default function TodayCard({ initialPrompt }: { initialPrompt?: DailyPrompt }) {
  const { user, profile, refreshProfile } = useAuth();
  const prompt = useTodayPrompt(initialPrompt);
  const [justSaved, setJustSaved] = React.useState<ReflectionSaved | null>(null);

  const { data: recent, mutate } = useSWR<RecentPosts>(
    user ? `/api/posts?userId=${user.uid}&limit=20&currentUserId=${user.uid}` : null,
    (url: string) => fetch(url).then((response) => response.json()),
    { revalidateOnFocus: false },
  );

  if (!user) return null;
  if (!prompt) return <div className="px-4 pt-4"><div className="skeleton h-48 w-full rounded-card" aria-hidden /></div>;

  const reflectionDates = (recent?.posts || []).filter((post) => !post.isRepost).map((post) => post.createdAt);
  if (justSaved) reflectionDates.push(new Date().toISOString());
  const lastReflection = justSaved ? new Date() : profile?.lastReflectionDate ? new Date(profile.lastReflectionDate) : null;
  const reflectedToday = Boolean(justSaved) || reflectionDates.some((date) => isToday(new Date(date))) ||
    Boolean(lastReflection && isToday(lastReflection));
  const streak = justSaved?.streak.streakDays ?? profile?.streakDays ?? 0;

  if (!reflectedToday) {
    return (
      <div className="px-4 pt-4">
        <QuickComposer
          variant="app"
          initialPrompt={{ id: prompt.id, question: prompt.question }}
          onSaved={(result) => {
            setJustSaved(result);
            if (result.firstReflection) {
              try {
                localStorage.setItem(COACHMARK_PENDING_KEY, "1");
              } catch {
                // The tour is optional.
              }
            }
            void refreshProfile();
            void mutate();
          }}
        />
      </div>
    );
  }

  return (
    <div className="px-4 pt-4">
      <Card aria-labelledby="today-done-title">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-micro font-semibold uppercase tracking-wider text-primary-text">Today&apos;s reflection</p>
            <div role={justSaved ? "status" : undefined}>
              <h2 id="today-done-title" className="mt-1 text-h3">
                {justSaved ? "Saved. See you tomorrow." : "You reflected today."}
              </h2>
            </div>
            <p className="mt-1 text-caption text-muted-foreground">
              {lastReflection
                ? Date.now() - lastReflection.getTime() < 60_000
                  ? "Last reflection just now."
                  : `Last reflection ${formatDistanceToNowStrict(lastReflection, { addSuffix: true })}.`
                : null}{" "}
              {justSaved?.post.visibility === "private" ? "Only you can see it." : null}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-elevated px-2.5 py-1 text-caption font-semibold tabular-nums">
            <Flame className="size-4 text-warning" aria-hidden />
            {streak}<span className="sr-only">-day streak</span>
          </span>
        </div>
        <WeekStrip dates={reflectionDates} className="mt-4" />
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="#prompt-answers" className={cn(buttonVariants({ size: "sm" }))}>
            Read others&apos; reflections
          </a>
          <Link href={composeHref(prompt, "today-card")} className={buttonVariants({ variant: "secondary", size: "sm" })}>
            <PenLine aria-hidden /> Write another
          </Link>
        </div>
      </Card>
    </div>
  );
}
