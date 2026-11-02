"use client";

import Link from "next/link";
import useSWR from "swr";
import { FileQuestion } from "lucide-react";
import PostDetailClient from "@/components/PostDetailClient";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/providers/AuthProvider";
import type { PostType } from "@/types";

/**
 * Private reflections are not server-rendered. The API decides, using the
 * viewer's token, whether this is the author; everyone else gets the same
 * "not found" as a missing post.
 */
export default function PrivatePostLoader({ id }: { id: string }) {
  const { user, loading } = useAuth();
  const { data, isLoading } = useSWR<{ post: PostType } | null>(
    !loading && user ? `/api/posts/${id}?viewer=${user.uid}` : null,
    async (url: string) => {
      const response = await fetch(url, { cache: "no-store" });
      return response.ok ? response.json() : null;
    },
    { revalidateOnFocus: false },
  );

  if (loading || (user && isLoading)) {
    return (
      <div className="space-y-3 p-4" aria-busy="true" aria-label="Loading reflection">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (data?.post) return <PostDetailClient initialPost={data.post} />;

  return (
    <EmptyState
      icon={FileQuestion}
      title="This reflection isn't available"
      description="It may have been deleted, or its author keeps it private."
      action={<Link href="/feed" className={buttonVariants({ variant: "secondary" })}>Back to Home</Link>}
    />
  );
}
