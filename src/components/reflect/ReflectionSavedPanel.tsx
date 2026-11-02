"use client";

import React from "react";
import Link from "next/link";
import { BellRing, BookOpen, Check, Flame, Lock, Users } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/Card";
import ReminderPrimer from "@/components/reflect/ReminderPrimer";
import { shouldOfferReminders } from "@/lib/push-priming";
import { copy } from "@/lib/copy";
import { useToast } from "@/providers/ToastProvider";
import type { ReflectionSaved } from "@/hooks/useSubmitReflection";
import type { PostVisibility } from "@/lib/post-visibility";

const COACHMARK_PENDING_KEY = "mindfuel:coachmark:pending";

/**
 * The moment after saving: confirm, show the streak, and offer two clear
 * next steps (read others, come back tomorrow).
 */
export default function ReflectionSavedPanel({ result }: { result: ReflectionSaved }) {
  const reduceMotion = useReducedMotion();
  const { showToast } = useToast();
  const [visibility, setVisibility] = React.useState<PostVisibility>(result.post.visibility === "public" ? "public" : "private");
  const [sharing, setSharing] = React.useState(false);
  const [primerOpen, setPrimerOpen] = React.useState(false);
  const [canOfferReminders, setCanOfferReminders] = React.useState(false);
  const [remindersOn, setRemindersOn] = React.useState(false);
  const streak = Math.max(1, result.streak?.streakDays || 1);

  React.useEffect(() => {
    setCanOfferReminders(shouldOfferReminders());
    try {
      // The install card may appear on the next Home visit (InstallPWA).
      localStorage.setItem("mindfuel_install_ready", "1");
    } catch {
      // Optional.
    }
    if (result.firstReflection) {
      try {
        localStorage.setItem(COACHMARK_PENDING_KEY, "1");
      } catch {
        // The coachmark is optional.
      }
    }
  }, [result.firstReflection]);

  const share = async () => {
    setSharing(true);
    try {
      const response = await fetch(`/api/posts/${result.post._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: "public" }),
      });
      if (!response.ok) throw new Error(String(response.status));
      setVisibility("public");
      showToast("Shared with the community.", "success");
    } catch {
      showToast("Couldn't share it right now. It's still saved privately.", "error");
    } finally {
      setSharing(false);
    }
  };

  return (
    <motion.section
      aria-labelledby="saved-title"
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      className="mx-auto w-full max-w-md px-4 py-10"
    >
      <div className="flex flex-col items-center text-center" role="status">
        <span className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-7" strokeWidth={2.6} aria-hidden />
        </span>
        <h1 id="saved-title" className="mt-4 text-h1">
          {streak === 1 ? "Saved. Day 1 started." : `Saved. Day ${streak} of your streak.`}
        </h1>
        <p className="mt-2 text-body-sm text-muted-foreground">
          <Flame className="mr-1 inline size-4 -translate-y-px text-warning" aria-hidden />
          <span className="tabular-nums">{streak}-day streak.</span> Reflect again tomorrow to keep it going.
        </p>
      </div>

      <Card className="mt-6 flex items-start gap-3">
        {visibility === "private" ? (
          <>
            <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-body-sm font-semibold">Only you can see this {copy.noun}.</p>
              <p className="mt-0.5 text-caption text-muted-foreground">Share it if it might help someone else.</p>
            </div>
            <Button size="sm" variant="secondary" loading={sharing} onClick={share}>Share</Button>
          </>
        ) : (
          <>
            <Users className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <p className="text-body-sm font-semibold">Shared with the community.</p>
          </>
        )}
      </Card>

      <div className="mt-6 grid gap-2">
        <Link href="/feed" className={buttonVariants({ size: "lg", block: true })}>
          <BookOpen aria-hidden /> Read what others wrote today
        </Link>
        {remindersOn ? (
          <p className="flex h-12 items-center justify-center gap-2 text-body-sm text-muted-foreground">
            <BellRing className="size-4" aria-hidden /> We&apos;ll remind you tomorrow.
          </p>
        ) : canOfferReminders ? (
          <Button variant="secondary" size="lg" block onClick={() => setPrimerOpen(true)}>
            <BellRing aria-hidden /> Come back tomorrow: get a reminder
          </Button>
        ) : (
          <p className="py-3 text-center text-body-sm text-muted-foreground">Come back tomorrow for a new prompt.</p>
        )}
      </div>

      <ReminderPrimer
        open={primerOpen}
        onClose={(enabled) => {
          setPrimerOpen(false);
          if (enabled) setRemindersOn(true);
          else setCanOfferReminders(false);
        }}
      />
    </motion.section>
  );
}
