"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import FeedClient from "@/components/FeedClient";

/**
 * FeedGuard — wraps FeedClient and redirects unauthenticated users to the landing page.
 */
import type { PostType } from "@/types";

export default function FeedGuard({ initialPosts = [] }: { initialPosts?: PostType[] }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  // Render public/cached posts while Firebase restores the session. If the
  // viewer is signed out the redirect happens after restoration, but no full-
  // screen loader blocks signed-in users from seeing the feed immediately.
  if (!loading && !user) return null;

  return <FeedClient initialReflectionPosts={initialPosts} />;
}
