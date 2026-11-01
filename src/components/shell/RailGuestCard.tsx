"use client";

import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy";

/** Right-rail invitation for guests: what signing in adds, in one line. */
export default function RailGuestCard() {
  const { user, openSignInModal } = useAuth();
  if (user) return null;
  return (
    <section aria-labelledby="rail-guest-title" className="rounded-card border border-line bg-surface p-4">
      <h2 id="rail-guest-title" className="text-body font-semibold text-foreground">New to MindFuel?</h2>
      <p className="mt-1 text-caption text-muted-foreground">{copy.valueLine} {copy.nav.unlockMoreHint}</p>
      <Button block size="sm" className="mt-3" onClick={openSignInModal}>
        {copy.nav.joinFree}
      </Button>
    </section>
  );
}
