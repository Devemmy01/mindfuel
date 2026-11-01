"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { Button, buttonVariants } from "@/components/ui/button";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";

/**
 * Guest top bar: Browse the feed without a wall, read how it works, or sign in.
 * Members who reach `/` without the routing cookie are sent to their feed.
 */
export default function GuestHomeHeader() {
  const { user, loading, openSignInModal } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (loading || !user) return;
    if (new URLSearchParams(window.location.search).get("view") === "landing") return;
    router.replace("/feed");
  }, [loading, router, user]);

  return (
    <header className="sticky top-0 z-sticky border-b border-line bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
        <Link href="/" aria-label="MindFuel home" className="mr-auto flex items-center">
          <Image src="/logoDarkbg.png" alt="MindFuel" width={120} height={36} priority className="h-8 w-auto" />
        </Link>
        <nav aria-label="Site" className="flex items-center gap-1">
          <Link href="/feed" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Browse
          </Link>
          <a href="#how" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}>
            How it works
          </a>
          {user ? (
            <Link href="/feed" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              Open app
            </Link>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={openSignInModal} className="hidden sm:inline-flex">
                {copy.nav.signIn}
              </Button>
              <Button variant="secondary" size="sm" onClick={openSignInModal}>
                {copy.nav.joinFree}
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
