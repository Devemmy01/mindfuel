"use client";

import React from "react";
import updates from "@/config/updates.json";
import Dialog from "@/components/ui/Dialog";

const SEEN_KEY = "mindfuel:whats-new:seen";

type Update = { id: string; title: string; details: string; date: string; version: string };
const UPDATES = updates as Update[];

/** "What's new" is a quiet dot in menus. It never opens by itself. */
export function useWhatsNew() {
  const latest = UPDATES[0];
  const [seen, setSeen] = React.useState<string | null>("unknown");

  React.useEffect(() => {
    try {
      setSeen(localStorage.getItem(SEEN_KEY));
    } catch {
      setSeen(latest?.id ?? null);
    }
  }, [latest?.id]);

  const markSeen = React.useCallback(() => {
    if (!latest) return;
    setSeen(latest.id);
    try {
      localStorage.setItem(SEEN_KEY, latest.id);
    } catch {
      // The dot may come back next visit; harmless.
    }
  }, [latest]);

  return { updates: UPDATES.slice(0, 3), unseen: Boolean(latest) && seen !== "unknown" && seen !== latest.id, markSeen };
}

export function WhatsNewDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { updates: recent, markSeen } = useWhatsNew();
  React.useEffect(() => {
    if (open) markSeen();
  }, [markSeen, open]);

  return (
    <Dialog open={open} onClose={onClose} title="What's new" size="lg">
      <ol className="space-y-5">
        {recent.map((update) => (
          <li key={update.id}>
            <p className="text-micro font-semibold text-subtle-foreground tabular-nums">
              {new Date(update.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} · v{update.version}
            </p>
            <h3 className="mt-1 text-body font-semibold">{update.title}</h3>
            <p className="mt-1 whitespace-pre-line text-body-sm text-muted-foreground">{update.details}</p>
          </li>
        ))}
      </ol>
    </Dialog>
  );
}

export function UnseenDot({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`size-2 rounded-full bg-primary ${className}`} />;
}
