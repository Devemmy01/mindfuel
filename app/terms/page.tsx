import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="w-full flex-col flex min-h-screen">
      <header className="sticky top-0 z-40 glass-strong border-b border-border/60 px-4 py-4 flex items-center gap-3">
        <Link href="/" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary/60 transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </Link>
        <span className="font-bold text-[17px] tracking-tight">Terms of Service</span>
      </header>

      <div className="px-4 py-8 space-y-6 md:px-8 max-w-2xl mx-auto w-full">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">MindFuel Terms</h1>
          <p className="text-muted-foreground leading-relaxed">
            By using MindFuel, you agree to join a community dedicated to thoughtful, respectful discourse. Here are the rules of the road.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold">Community Guidelines</h2>
          <p className="text-muted-foreground leading-relaxed">
            Please be kind. Hate speech, harassment, and spam are strictly prohibited and will result in immediate account termination. You retain the rights to the content you create, but grant us a license to display it within the MindFuel platform.
          </p>
        </div>
      </div>
    </div>
  );
}
