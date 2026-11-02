"use client";

import React from "react";
import Link from "next/link";
import { MailX } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/Card";

/**
 * Link scanners open email links automatically, so the page confirms with one
 * tap instead of unsubscribing on load. Mail clients use the one-click header.
 */
export default function UnsubscribeClient({ token, categoryTitle }: { token: string | null; categoryTitle: string | null }) {
  const [state, setState] = React.useState<"idle" | "busy" | "done" | "error">("idle");

  if (!token || !categoryTitle) {
    return (
      <Card>
        <h1 className="text-h2">This link has expired</h1>
        <p className="mt-2 text-body-sm text-muted-foreground">You can still choose which emails you get in your notification settings.</p>
        <Link href="/settings/notifications" className={`${buttonVariants({ variant: "secondary" })} mt-4`}>Open settings</Link>
      </Card>
    );
  }

  return (
    <Card>
      <MailX className="size-6 text-muted-foreground" aria-hidden />
      {state === "done" ? (
        <div role="status">
          <h1 className="mt-3 text-h2">You&apos;re unsubscribed</h1>
          <p className="mt-2 text-body-sm text-muted-foreground">
            We won&apos;t email you about &ldquo;{categoryTitle}&rdquo; anymore. Other choices stay as they were.
          </p>
          <Link href="/settings/notifications" className={`${buttonVariants({ variant: "secondary" })} mt-4`}>Review all settings</Link>
        </div>
      ) : (
        <>
          <h1 className="mt-3 text-h2">Stop &ldquo;{categoryTitle}&rdquo; emails?</h1>
          <p className="mt-2 text-body-sm text-muted-foreground">You can turn them back on any time in your notification settings.</p>
          {state === "error" ? <p role="alert" className="mt-3 text-caption text-destructive">That didn&apos;t work. Please try again.</p> : null}
          <Button
            className="mt-4"
            loading={state === "busy"}
            onClick={async () => {
              setState("busy");
              const response = await fetch(`/api/unsubscribe?token=${encodeURIComponent(token)}`, { method: "POST" }).catch(() => null);
              setState(response?.ok ? "done" : "error");
            }}
          >
            Unsubscribe
          </Button>
        </>
      )}
    </Card>
  );
}
