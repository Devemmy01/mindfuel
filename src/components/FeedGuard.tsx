"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import FeedClient from "@/components/FeedClient";

/**
 * FeedGuard — wraps FeedClient and redirects unauthenticated users to the landing page.
 */
export default function FeedGuard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex flex-col w-full min-h-screen items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand-green border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return <FeedClient />;
}
