"use client";

import React from "react";
import { useAuth } from "@/providers/AuthProvider";
import { Sparkles, ArrowRight } from "lucide-react";

export default function GuestSignInPrompt() {
  const { user, openSignInModal } = useAuth();

  if (user) return null;

  return (
    <div className="rounded-3xl border border-brand-green/20 bg-gradient-to-br from-brand-green/5 via-card to-card p-5 space-y-4 shadow-[0_0_30px_rgba(0,191,99,0.06)]">
      {/* Icon */}
      <div className="w-10 h-10 rounded-2xl bg-brand-green/10 border border-brand-green/20 flex items-center justify-center text-brand-green">
        <Sparkles className="w-5 h-5" />
      </div>

      {/* Copy */}
      <div className="space-y-1.5">
        <h3 className="font-black text-[15px] text-foreground leading-tight tracking-tight">
          New to MindFuel?
        </h3>
        <p className="text-[12.5px] text-muted-foreground leading-relaxed font-medium">
          Join a community that thinks deeply. Share reflections, save ideas, and grow without the noise.
        </p>
      </div>

      {/* CTA */}
      <button
        onClick={openSignInModal}
        className="w-full flex items-center justify-center gap-2 h-11 bg-brand-green text-white rounded-full font-black text-[13px] hover:brightness-110 transition-all shadow-[0_4px_20px_rgba(0,191,99,0.3)] press-scale"
      >
        Sign in with Google
        <ArrowRight size={15} strokeWidth={3} />
      </button>

      <p className="text-[11px] text-muted-foreground/60 text-center font-medium">
        Free forever · No algorithm · No noise
      </p>
    </div>
  );
}
