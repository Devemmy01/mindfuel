import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function CookiesPage() {
  return (
    <div className="w-full flex-col flex min-h-screen">
      <header className="sticky top-0 z-40 glass-strong border-b border-border/60 px-4 py-4 flex items-center gap-3">
        <Link href="/" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary/60 transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </Link>
        <span className="font-bold text-[17px] tracking-tight">Cookie Policy</span>
      </header>

      <div className="px-4 py-8 space-y-6 md:px-8 max-w-2xl mx-auto w-full">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">Minimal Cookies</h1>
          <p className="text-muted-foreground leading-relaxed">
            We use as few cookies as possible to keep MindFuel running securely. Because we don&apos;t rely on an ad-driven model, you won&apos;t find tracking cookies here.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold">What We Use Cookies For</h2>
          <p className="text-muted-foreground leading-relaxed">
            The only cookies used by MindFuel are essential ones managed by our authentication provider (Firebase) to keep you safely logged in. That&apos;s it.
          </p>
        </div>
      </div>
    </div>
  );
}
