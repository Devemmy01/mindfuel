"use client";

import React, { Suspense } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const pageSpinner = (
  <div className="flex h-screen w-full items-center justify-center">
    <Loader2 className="h-6 w-6 animate-spin text-brand-green" />
  </div>
);

const CardCreator = dynamic(() => import("@/components/CardCreator"), {
  ssr: false,
  loading: () => pageSpinner,
});

export default function CreatePage() {
  return (
    <Suspense fallback={pageSpinner}>
      <CardCreator />
    </Suspense>
  );
}
