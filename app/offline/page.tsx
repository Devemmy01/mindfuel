"use client";

import React from "react";
import { WifiOff, Home } from "lucide-react";
import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-neutral-50 dark:bg-neutral-950 text-center space-y-8">
      <div className="w-24 h-24 bg-neutral-100 dark:bg-neutral-900 rounded-full flex items-center justify-center text-neutral-400">
        <WifiOff className="w-10 h-10" />
      </div>
      <div className="space-y-4">
        <h1 className="text-4xl font-semibold tracking-tight">You&apos;re Offline</h1>
        <p className="text-neutral-500 max-w-sm mx-auto">
          MindFuel requires an active connection to fuel your feed. Take this moment to reflect while you wait.
        </p>
      </div>
      <Link 
        href="/" 
        className="inline-flex items-center space-x-2 px-8 py-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-semibold rounded-2xl transition-transform hover:scale-105 active:scale-95"
      >
        <Home className="w-5 h-5" />
        <span>Try Home</span>
      </Link>
    </div>
  );
}
