"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";

const PENDING_KEY = "mindfuel:coachmark:pending";
const DONE_KEY = "mindfuel:coachmark:done";

type Step = { target: string; mobileTarget?: string; title: string; body: string };

const STEPS: Step[] = [
  { target: "write", title: "Write any time", body: "Tap Reflect for today's prompt. A sentence or two is enough." },
  { target: "home", title: "See what others learned", body: "Home shows today's prompt answers and the wider community." },
  { target: "saved", mobileTarget: "profile", title: "Keep what helps", body: "Bookmark any reflection to find it in Saved. Your streak lives on your profile." },
];

function visibleTarget(name: string) {
  return Array.from(document.querySelectorAll<HTMLElement>(`[data-coachmark="${name}"]`)).find(
    (element) => element.offsetParent !== null,
  );
}

/**
 * A three-step tour shown once after the first reflection. It never blocks
 * the page: it highlights real navigation and can be skipped with Escape.
 */
export default function FirstRunCoachmark() {
  const { user, profile, loading } = useAuth();
  const pathname = usePathname();
  const [step, setStep] = React.useState<number | null>(null);
  const highlighted = React.useRef<HTMLElement | null>(null);

  const finish = React.useCallback((completed: boolean) => {
    setStep(null);
    try {
      localStorage.removeItem(PENDING_KEY);
      localStorage.setItem(DONE_KEY, "1");
    } catch {
      // Stored on the account below as well.
    }
    track(completed ? "coachmark_completed" : "coachmark_skipped");
    if (user) {
      void fetch("/api/users/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboarded: true }),
      });
    }
  }, [user]);

  // Start only on regular app screens, once, for people who just finished
  // their first reflection and have not completed the tour on any device.
  React.useEffect(() => {
    if (loading || !user || step !== null || pathname === "/create") return;
    if (profile?.onboardedAt) return;
    try {
      if (localStorage.getItem(DONE_KEY) || !localStorage.getItem(PENDING_KEY)) return;
    } catch {
      return;
    }
    const timer = window.setTimeout(() => setStep(0), 800);
    return () => window.clearTimeout(timer);
  }, [loading, pathname, profile?.onboardedAt, step, user]);

  // Highlight the real control for the current step.
  React.useEffect(() => {
    highlighted.current?.removeAttribute("data-coachmark-active");
    if (step === null) return;
    const current = STEPS[step];
    const target = visibleTarget(current.target) || (current.mobileTarget ? visibleTarget(current.mobileTarget) : undefined);
    target?.setAttribute("data-coachmark-active", "true");
    highlighted.current = target ?? null;
    return () => target?.removeAttribute("data-coachmark-active");
  }, [step]);

  React.useEffect(() => {
    if (step === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [finish, step]);

  if (step === null) return null;
  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <section
      aria-label="Quick tour"
      aria-live="polite"
      className="fixed inset-x-3 bottom-[calc(var(--tabbar-height)+0.75rem+env(safe-area-inset-bottom))] z-overlay rounded-card border border-line bg-surface-raised p-4 shadow-e3 md:inset-x-auto md:bottom-6 md:left-[calc(50%-12rem)] md:w-96"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-micro font-semibold text-subtle-foreground tabular-nums">{step + 1} of {STEPS.length}</p>
          <h2 className="mt-1 text-body font-semibold">{current.title}</h2>
          <p className="mt-1 text-body-sm text-muted-foreground">{current.body}</p>
        </div>
        <button
          type="button"
          onClick={() => finish(false)}
          aria-label="Skip tour"
          className="-mr-1 -mt-1 flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => finish(false)}>Skip</Button>
        <Button size="sm" onClick={() => (last ? finish(true) : setStep(step + 1))}>{last ? "Done" : "Next"}</Button>
      </div>
    </section>
  );
}
