"use client";

import React from "react";
import { Bell, Share, SquarePlus } from "lucide-react";
import Dialog from "@/components/ui/Dialog";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { pushSupport, recordReminderDecline } from "@/lib/push-priming";
import { track } from "@/lib/analytics";

/**
 * Explains reminders before the browser asks. "Turn on" triggers the
 * permission prompt from this click, which iOS requires.
 */
export default function ReminderPrimer({ open, onClose }: { open: boolean; onClose: (enabled: boolean) => void }) {
  const { subscribeUser, isSubscribing } = usePushNotifications();
  const [support, setSupport] = React.useState<ReturnType<typeof pushSupport>>("supported");

  React.useEffect(() => {
    if (!open) return;
    setSupport(pushSupport());
    track("push_prompt_shown", { source: "first-reflection" });
  }, [open]);

  const decline = () => {
    recordReminderDecline();
    track("push_prompt_declined");
    onClose(false);
  };

  if (support === "ios-needs-install") {
    return (
      <Dialog
        open={open}
        onClose={decline}
        title="Get a daily reminder on iPhone"
        description="iPhone only sends reminders to apps on your Home Screen. It takes two taps:"
        footer={<Button onClick={decline}>Got it</Button>}
      >
        <ol className="space-y-3 text-body-sm">
          <li className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-full bg-surface-elevated"><Share className="size-4" aria-hidden /></span>
            Tap <strong className="font-semibold">Share</strong> in Safari&apos;s toolbar.
          </li>
          <li className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-full bg-surface-elevated"><SquarePlus className="size-4" aria-hidden /></span>
            Choose <strong className="font-semibold">Add to Home Screen</strong>, then open MindFuel from there.
          </li>
        </ol>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={decline}
      title="Want a nudge tomorrow?"
      description="Turn on notifications and MindFuel will send:"
      footer={
        <>
          <Button variant="ghost" onClick={decline}>Not now</Button>
          <Button
            loading={isSubscribing}
            onClick={async () => {
              const enabled = await subscribeUser();
              track(enabled ? "push_prompt_accepted" : "push_prompt_declined");
              onClose(enabled);
            }}
          >
            <Bell aria-hidden /> Turn on
          </Button>
        </>
      }
    >
      <ul className="list-disc space-y-1.5 pl-5 text-body-sm text-muted-foreground">
        <li>A daily reminder with that day&apos;s prompt</li>
        <li>Replies to your reflections</li>
        <li>New messages</li>
      </ul>
      <p className="mt-3 text-caption text-subtle-foreground">Your browser will ask to confirm. You can turn this off any time.</p>
    </Dialog>
  );
}
