"use client";

import React, { Suspense } from "react";
import dynamic from "next/dynamic";

const CardCreator = dynamic(() => import("@/components/CardCreator"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    </div>
  ),
});

export default function CreatePage() {
  return (
    <Suspense fallback={<div className="w-full h-screen flex items-center justify-center">Loading...</div>}>
      <CardCreator />
    </Suspense>
  );
}
