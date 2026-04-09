import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="w-full flex-col flex min-h-screen">
      <header className="sticky top-0 z-40 glass-strong border-b border-border/60 px-4 py-4 flex items-center gap-3">
        <Link href="/" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary/60 transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </Link>
        <span className="font-bold text-[17px] tracking-tight">About MindFuel</span>
      </header>

      <div className="px-4 py-8 space-y-6 md:px-8 max-w-2xl mx-auto w-full">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">Fuel Your Mind Daily</h1>
          <p className="text-muted-foreground leading-relaxed">
            MindFuel is a calm, intentional space to share your thoughts, curations, and ideas without the noise. 
            We believe that social media doesn&apos;t have to be driven by engagement-chasing metrics, but rather by thoughtful reflection and authentic connection.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold">Our Philosophy</h2>
          <p className="text-muted-foreground leading-relaxed">
            Built by Lumyn, MindFuel is an antidote to algorithmic feeds. Here, you&apos;ll find a community that values qualitative insights over quantitative likes. 
            Take your time, read deeply, and share the thoughts that truly matter to you.
          </p>
        </div>
      </div>
    </div>
  );
}
