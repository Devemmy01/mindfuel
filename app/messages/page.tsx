import type { Metadata } from "next";
import MessagesClient from "@/components/MessagesClient";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = { title: "Messages", robots: { index: false, follow: false } };

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[70vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-green" /></div>}>
      <MessagesClient />
    </Suspense>
  );
}
