"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bookmark,
  Check,
  ChevronRight,
  Flame,
  Heart,
  MessageCircle,
  PenLine,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { landingFaqs } from "@/lib/seo";

const ease = [0.16, 1, 0.3, 1] as const;

const prompts = [
  { label: "Perspective", text: "What changed your mind lately?", accent: "from-violet-400/25 to-violet-400/5" },
  { label: "Gratitude", text: "What ordinary thing felt special today?", accent: "from-amber-300/25 to-amber-300/5" },
  { label: "Growth", text: "What are you learning to let go of?", accent: "from-emerald-300/25 to-emerald-300/5" },
];

const features = [
  {
    icon: PenLine,
    eyebrow: "Make it yours",
    title: "A journal that talks back.",
    copy: "Capture a lesson privately or share it with people who add thoughtful perspective—not noise.",
  },
  {
    icon: Sparkles,
    eyebrow: "Never face a blank page",
    title: "Prompts with a pulse.",
    copy: "Fresh questions help you notice what the rush of the day usually hides.",
  },
  {
    icon: Users,
    eyebrow: "Social, gently",
    title: "People over performance.",
    copy: "Find honest reflections, useful ideas, and conversations that leave you better than they found you.",
  },
  {
    icon: Bookmark,
    eyebrow: "Your growing archive",
    title: "Keep the thoughts that keep you.",
    copy: "Save reflections and return to the ideas that changed how you see yourself and the world.",
  },
];

const reveal = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.7, ease },
};

function AvatarStack() {
  return (
    <div className="flex -space-x-2.5" aria-hidden="true">
      {["/pp1.png", "/pp5.png", "/pp8.png", "/pp13.png"].map((src, index) => (
        <Image
          key={src}
          src={src}
          alt=""
          width={36}
          height={36}
          className="h-9 w-9 rounded-full border-2 border-[#07110c] object-cover"
          style={{ zIndex: 4 - index }}
        />
      ))}
    </div>
  );
}

function ProductPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28, rotate: 1 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ delay: 0.3, duration: 0.9, ease }}
      className="relative mx-auto w-full max-w-[560px] lg:ml-auto"
    >
      <div className="absolute -inset-8 rounded-[3rem] bg-brand-green/10 blur-3xl" />
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#07110c]/95 p-2 shadow-[0_40px_100px_rgba(0,0,0,0.55)] sm:rounded-[2.5rem] sm:p-3">
        <div className="rounded-[1.55rem] border border-white/[0.07] bg-[#030806] sm:rounded-[2rem]">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-brand-green shadow-[0_0_12px_rgba(0,191,99,.8)]" />
              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-white/45">Today on MindFuel</span>
            </div>
            <Search className="h-4 w-4 text-white/35" />
          </div>

          <div className="p-4 sm:p-5">
            <div className="mb-3 rounded-2xl border border-brand-green/20 bg-gradient-to-br from-brand-green/15 via-brand-green/[0.05] to-transparent p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="rounded-full bg-brand-green/15 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-brand-green">Daily spark</span>
                <Sparkles className="h-4 w-4 text-brand-green" />
              </div>
              <p className="max-w-sm text-xl font-black leading-tight text-white sm:text-2xl">
                What is something you understand differently now?
              </p>
              <div className="mt-5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-white/45">
                  <AvatarStack />
                  <span>32 reflections</span>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-green text-white shadow-[0_10px_30px_rgba(0,191,99,.3)]">
                  <PenLine className="h-4 w-4" />
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <Image src="/pp15.png" alt="Community member" width={40} height={40} className="h-10 w-10 rounded-full object-cover ring-2 ring-brand-green/20" />
                <div>
                  <p className="text-sm font-bold text-white">Amara N.</p>
                  <p className="text-[11px] text-white/35">2 hours ago · Growth</p>
                </div>
              </div>
              <p className="text-[15px] leading-relaxed text-white/80 sm:text-base">
                I used to think clarity arrived before action. Lately I&apos;m learning that clarity is often the reward for beginning.
              </p>
              <div className="mt-5 flex items-center gap-6 border-t border-white/[0.06] pt-4 text-white/35">
                <span className="flex items-center gap-2 text-xs"><Heart className="h-4 w-4" /> 24</span>
                <span className="flex items-center gap-2 text-xs"><MessageCircle className="h-4 w-4" /> 6</span>
                <Bookmark className="ml-auto h-4 w-4" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -bottom-7 -left-3 hidden items-center gap-3 rounded-2xl border border-white/10 bg-[#0b1711]/95 p-3.5 shadow-2xl backdrop-blur-xl sm:flex lg:-left-10"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-400/15 text-orange-300"><Flame className="h-5 w-5" /></div>
        <div><p className="text-sm font-black text-white">12 day streak</p><p className="text-[10px] text-white/40">Your ideas are compounding</p></div>
      </motion.div>
    </motion.div>
  );
}

export default function LandingPage() {
  const { user, loading, openSignInModal } = useAuth();
  const router = useRouter();
  const [routeReady, setRouteReady] = useState(false);
  const [isIntentionalVisit, setIsIntentionalVisit] = useState(false);

  useEffect(() => {
    setIsIntentionalVisit(
      new URLSearchParams(window.location.search).get("view") === "landing"
    );
    setRouteReady(true);
    router.prefetch("/feed");
  }, [router]);

  useEffect(() => {
    if (routeReady && !loading && user && !isIntentionalVisit) {
      router.replace("/feed");
    }
  }, [user, loading, routeReady, isIntentionalVisit, router]);

  // Keep the full landing page in the server-rendered HTML so search engines,
  // link unfurlers, and no-JS visitors receive the actual product story. Once
  // Firebase resolves a returning session, show a brief transition to the app.
  if (routeReady && !loading && user && !isIntentionalVisit) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-[#020604] text-white"
        role="status"
        aria-label="Opening MindFuel"
      >
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-brand-green/20 blur-2xl" />
            <Image
              src="/splash-logo.png"
              alt=""
              width={72}
              height={72}
              priority
              className="relative h-16 w-16 animate-pulse object-contain"
            />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.24em] text-white/35">
            Opening your space
          </span>
        </div>
      </div>
    );
  }

  const primaryAction = user ? (
    <Link href="/feed" className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#00a855] px-6 py-3.5 text-sm font-black text-white shadow-[0_14px_40px_rgba(0,191,99,.25)] transition hover:-translate-y-0.5 hover:bg-[#00a855]/90">
      Back to my feed <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
    </Link>
  ) : (
    <button onClick={openSignInModal} className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#00a855] px-6 py-3.5 text-sm font-black text-white shadow-[0_14px_40px_rgba(0,191,99,.25)] transition hover:-translate-y-0.5 hover:bg-[#00a855]/90">
      Start reflecting—it&apos;s free <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
    </button>
  );

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#020604] text-white selection:bg-brand-green/30">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-60 [background-image:linear-gradient(rgba(255,255,255,.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.018)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />

      <nav className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between rounded-full border border-white/[0.08] bg-[#06100b]/80 px-4 shadow-2xl shadow-black/20 backdrop-blur-2xl sm:px-5">
          <Link href={user ? "/?view=landing" : "/"} aria-label="MindFuel landing page" className="flex items-center">
            <Image src="/logoDarkbg.png" alt="MindFuel" width={132} height={40} priority className="h-9 w-auto object-contain" />
          </Link>
          <div className="hidden items-center gap-7 md:flex">
            <a href="#why" className="text-sm font-semibold text-white/55 transition hover:text-white">Why MindFuel</a>
            <a href="#features" className="text-sm font-semibold text-white/55 transition hover:text-white">Features</a>
            <Link href="/guides" className="text-sm font-semibold text-white/55 transition hover:text-white">Guides</Link>
            <a href="#faq" className="text-sm font-semibold text-white/55 transition hover:text-white">FAQ</a>
          </div>
          <div className="flex items-center gap-2">
            {!user && <button onClick={openSignInModal} className="hidden px-3 py-2 text-sm font-bold text-white/60 transition hover:text-white sm:block">Sign in</button>}
            {user ? (
              <Link href="/feed" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-black text-black transition hover:bg-brand-green hover:text-white hover:bg-[#00a855] sm:text-sm">Open app <ArrowRight className="h-3.5 w-3.5" /></Link>
            ) : (
              <button onClick={openSignInModal} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-black text-black transition hover:bg-brand-green hover:text-white hover:bg-[#00a855] sm:text-sm">Join MindFuel <ArrowRight className="h-3.5 w-3.5" /></button>
            )}
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        <section className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-16 px-5 pb-20 pt-32 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:px-12 lg:pt-28">
          <div className="relative">
            <div className="absolute -left-36 -top-40 h-[420px] w-[420px] rounded-full bg-brand-green/15 blur-[120px]" />
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease }} className="relative mb-6 inline-flex items-center gap-2 rounded-full border border-brand-green/20 bg-brand-green/[0.07] px-3 py-1.5 text-[10px] font-black tracking-[0.2em] text-brand-green sm:text-[11px]">
              The personal growth network
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.8, ease }} className="relative max-w-3xl text-[3.35rem] font-black leading-[.94] tracking-[-0.055em] sm:text-7xl lg:text-[5.25rem]">
              Less scrolling.<br />
              More <span className="bg-gradient-to-r from-brand-green via-emerald-300 to-lime-200 bg-clip-text text-transparent">becoming.</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16, duration: 0.8, ease }} className="relative mt-7 max-w-xl text-base leading-7 text-white/55 sm:text-lg sm:leading-8">
              MindFuel is a personal growth network where people grow together through reflection—sharing lessons, finding perspective, and turning everyday insight into lasting change.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24, duration: 0.8, ease }} className="relative mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              {primaryAction}
              <a href="#features" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-6 py-3.5 text-sm font-bold text-white/70 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white">See how it feels <ChevronRight className="h-4 w-4" /></a>
            </motion.div>
            {!user && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.34, duration: 0.8 }} className="relative mt-3 text-center text-[11px] font-semibold text-white/35 sm:text-left">
                Free to join · Continue with Google · Start in under a minute
              </motion.p>
            )}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.42, duration: 0.8 }} className="relative mt-9 flex items-center gap-4">
              <AvatarStack />
              <p className="text-xs leading-5 text-white/40"><span className="font-bold text-white/75">Built for thoughtful humans</span><br />Free to join. No pressure to perform.</p>
            </motion.div>
          </div>
          <ProductPreview />
        </section>

        <section id="why" className="border-y border-white/[0.06] bg-white/[0.015]">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:px-12 lg:py-32">
            <motion.div {...reveal}>
              <p className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-brand-green">A better kind of social</p>
              <h2 className="max-w-md text-4xl font-black leading-[1.03] tracking-[-0.045em] sm:text-5xl">The internet is loud.<br /><span className="text-white/35">Your mind doesn&apos;t have to be.</span></h2>
            </motion.div>
            <motion.div {...reveal} className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.75rem] border border-white/[0.07] bg-black/20 p-6 sm:p-7">
                <p className="mb-6 text-[10px] font-black uppercase tracking-[0.2em] text-white/25">Most platforms reward</p>
                <div className="space-y-4 text-lg font-bold text-white/30"><p className="line-through decoration-white/15">Hot takes</p><p className="line-through decoration-white/15">Endless reactions</p><p className="line-through decoration-white/15">Performing a perfect life</p></div>
              </div>
              <div className="rounded-[1.75rem] border border-brand-green/20 bg-gradient-to-br from-brand-green/10 to-transparent p-6 sm:p-7">
                <p className="mb-6 text-[10px] font-black uppercase tracking-[0.2em] text-brand-green">MindFuel makes room for</p>
                <div className="space-y-4 text-lg font-bold"><p className="flex items-center gap-3"><Check className="h-4 w-4 text-brand-green" /> Honest reflection</p><p className="flex items-center gap-3"><Check className="h-4 w-4 text-brand-green" /> Useful perspective</p><p className="flex items-center gap-3"><Check className="h-4 w-4 text-brand-green" /> Visible personal growth</p></div>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
          <motion.div {...reveal} className="mb-14 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div><p className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-brand-green">Designed for depth</p><h2 className="max-w-2xl text-4xl font-black leading-[1.03] tracking-[-0.045em] sm:text-6xl">Everything you need to turn moments into meaning.</h2></div>
            <p className="max-w-sm text-sm leading-6 text-white/45 sm:text-base">A calm set of tools that gets richer with every thought you keep.</p>
          </motion.div>
          <div className="grid gap-4 md:grid-cols-2">
            {features.map(({ icon: Icon, eyebrow, title, copy }, index) => (
              <motion.article key={title} {...reveal} transition={{ duration: 0.7, delay: index * 0.06, ease }} className="group relative min-h-[300px] overflow-hidden rounded-[2rem] border border-white/[0.07] bg-white/[0.025] p-7 transition duration-500 hover:-translate-y-1 hover:border-brand-green/20 hover:bg-brand-green/[0.035] sm:p-9">
                <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-green/0 blur-3xl transition duration-500 group-hover:bg-brand-green/10" />
                <div className="mb-16 flex items-center justify-between"><span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-brand-green"><Icon className="h-5 w-5" /></span><span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/25">0{index + 1}</span></div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-brand-green">{eyebrow}</p><h3 className="mb-3 text-2xl font-black tracking-tight sm:text-3xl">{title}</h3><p className="max-w-md text-sm leading-6 text-white/45 sm:text-base">{copy}</p>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="overflow-hidden border-y border-white/[0.06] bg-[#06100b] py-24 lg:py-32">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <motion.div {...reveal} className="mx-auto mb-14 max-w-2xl text-center"><p className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-brand-green">A prompt for every season</p><h2 className="text-4xl font-black tracking-[-0.045em] sm:text-5xl">You already have something worth noticing.</h2><p className="mt-5 text-white/45">A good question simply helps you find it.</p></motion.div>
            <div className="grid gap-4 md:grid-cols-3">
              {prompts.map((prompt, index) => (
                <motion.button key={prompt.text} {...reveal} onClick={user ? () => router.push("/create") : openSignInModal} transition={{ duration: 0.7, delay: index * 0.08, ease }} className={`group min-h-[245px] rounded-[2rem] border border-white/[0.08] bg-gradient-to-br ${prompt.accent} p-7 text-left transition hover:-translate-y-1 hover:border-white/15`}>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{prompt.label}</span><p className="mt-10 text-2xl font-black leading-tight">“{prompt.text}”</p><span className="mt-8 inline-flex items-center gap-2 text-xs font-black text-white/45 transition group-hover:text-white">Write your answer <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
                </motion.button>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
          <motion.div {...reveal} className="mb-12 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div><p className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-brand-green">Learn the practice</p><h2 className="max-w-2xl text-4xl font-black tracking-[-0.045em] sm:text-5xl">Reflection gets easier when you know where to begin.</h2></div>
            <Link href="/guides" className="inline-flex items-center gap-2 text-sm font-black text-white/60 hover:text-white">Browse all guides <ArrowRight className="h-4 w-4" /></Link>
          </motion.div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["daily-reflection-questions", "60 daily reflection questions", "Questions for self-awareness, perspective, relationships, and tomorrow."],
              ["how-to-reflect", "How to reflect in five minutes", "A practical method that turns one moment into a lesson and a next step."],
              ["journaling-for-personal-growth", "Journaling for personal growth", "A sustainable beginner’s guide without the pressure to produce perfect pages."],
            ].map(([slug, title, copy]) => (
              <motion.article key={slug} {...reveal} className="group rounded-[1.75rem] border border-white/[0.07] bg-white/[0.025] p-6 transition hover:border-brand-green/20 hover:bg-brand-green/[0.035]">
                <h3 className="text-xl font-black">{title}</h3><p className="mt-3 text-sm leading-6 text-white/45">{copy}</p><Link href={`/guides/${slug}`} className="mt-6 inline-flex items-center gap-2 text-xs font-black text-brand-green">Read guide <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></Link>
              </motion.article>
            ))}
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-5xl px-5 py-24 sm:px-8 lg:py-32">
          <motion.div {...reveal} className="mb-12 text-center"><p className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-brand-green">Good questions</p><h2 className="text-4xl font-black tracking-[-0.045em] sm:text-5xl">A little more clarity.</h2></motion.div>
          <div className="grid gap-3 md:grid-cols-2">
            {landingFaqs.map((item, index) => (
              <motion.details key={item.question} {...reveal} transition={{ duration: 0.6, delay: Math.min(index * 0.04, 0.2), ease }} className="group rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 open:border-brand-green/20 open:bg-brand-green/[0.03]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-black sm:text-base">{item.question}<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-white/40 transition group-open:rotate-90 group-open:text-brand-green"><ChevronRight className="h-4 w-4" /></span></summary><p className="pt-4 text-sm leading-6 text-white/45">{item.answer}</p>
              </motion.details>
            ))}
          </div>
        </section>

        <section className="px-5 pb-20 sm:px-8">
          <motion.div {...reveal} className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] border border-brand-green/20 bg-brand-green px-6 py-20 text-center text-white shadow-[0_40px_100px_rgba(0,191,99,.15)] sm:px-12">
            <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,white_0,transparent_32%),radial-gradient(circle_at_80%_80%,#003d20_0,transparent_35%)]" />
            <div className="relative"><p className="mb-5 text-xs font-black uppercase tracking-[0.22em] text-white/65">Your life is already teaching you</p><h2 className="mx-auto max-w-3xl text-4xl font-black leading-[1] tracking-[-0.05em] sm:text-6xl">Keep the lesson.<br />Share the light.</h2><p className="mx-auto mt-6 max-w-xl text-sm leading-6 text-white/70 sm:text-base">One honest reflection can change your day—and be exactly what someone else needed to read.</p><div className="mt-9">{user ? <Link href="/feed" className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-4 text-sm font-black text-[#052d1a] transition hover:-translate-y-0.5">Return to your feed <ArrowRight className="h-4 w-4" /></Link> : <button onClick={openSignInModal} className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-4 text-sm font-black text-[#052d1a] transition hover:-translate-y-0.5">Join MindFuel for free <ArrowRight className="h-4 w-4" /></button>}</div></div>
          </motion.div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/[0.06] px-5 py-9 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-left">
          <div><Image src="/logoDarkbg.png" alt="MindFuel" width={118} height={36} className="h-8 w-auto object-contain" /><p className="mt-1 text-[11px] text-white/25">A place to become more yourself.</p></div>
          <div className="flex flex-wrap justify-center gap-5 text-xs font-semibold text-white/35"><Link href="/guides" className="hover:text-white">Guides</Link><Link href="/privacy" className="hover:text-white">Privacy</Link><Link href="/terms" className="hover:text-white">Terms</Link><Link href="/cookies" className="hover:text-white">Cookies</Link><a href="https://lumynhq.studio" target="_blank" rel="noreferrer" className="hover:text-white">Made by Lumyn</a></div>
        </div>
      </footer>
    </div>
  );
}
