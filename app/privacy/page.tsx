import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-static";

export default function PrivacyPage() {
  return (
    <div className="w-full flex-col flex min-h-screen">
      <header className="sticky top-0 z-40 glass-strong border-b border-border/60 px-4 py-4 flex items-center gap-3">
        <Link href="/" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary/60 transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </Link>
        <span className="font-bold text-[17px] tracking-tight">Privacy Policy</span>
      </header>

      <div className="px-4 py-8 space-y-6 md:px-8 max-w-2xl mx-auto w-full">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">Your Privacy Matters</h1>
          <p className="text-muted-foreground leading-relaxed">
            Last updated: April 2026. At MindFuel, we deeply respect your right to privacy. Because we are focused on creating a calm space, we minimize the data we collect and never sell your personal information to third parties.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold">Information We Collect</h2>
          <p className="text-muted-foreground leading-relaxed">
            We collect the basic information needed to run your account (like your email from Google authentication) and the thoughts you choose to share. We do not track your behavior across other sites or use intrusive analytics.
          </p>
        </div>
      </div>
    </div>
  );
}
