"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Users, TrendingUp, CheckCircle2 } from "lucide-react";

const PROMPTS = [
  { q: "What are you grateful to have learned?", cat: "Gratitude", color: "#f97316" },
  { q: "What's a belief you've changed your mind about?", cat: "Growth", color: "#06b6d4" },
  { q: "What lesson took you the longest to learn?", cat: "Reflection", color: "#8b5cf6" },
  { q: "What challenge helped you grow the most?", cat: "Resilience", color: "#10b981" },
];

const HOW_IT_WORKS = [
  { icon: BookOpen,   step: "01", title: "Reflect",  desc: "Answer daily reflection prompts or share lessons you've learned from life, work, and everything in between." },
  { icon: Users,      step: "02", title: "Connect",  desc: "Read how others are growing, learning, and navigating life. Find people who think deeply like you do." },
  { icon: TrendingUp, step: "03", title: "Grow",     desc: "Build a permanent record of your personal growth journey. MindFuel becomes more valuable the longer you use it." },
];

const AUDIENCE = ["Students", "Developers", "Designers", "Founders", "Creators", "Professionals", "Lifelong learners"];

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

const cardHover = {
  rest: { y: 0, scale: 1, boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" },
  hover: {
    y: -8,
    scale: 1.02,
    boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.2), 0 8px 10px -6px rgb(0 0 0 / 0.2)",
    transition: { duration: 0.3, ease: "easeOut" }
  }
};

export default function LandingPage() {
  const { user, loading, openSignInModal } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/feed");
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ── Ambient Background ── */}
      <div className="fixed pointer-events-none inset-0 -z-10">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            x: [0, 20, 0],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-brand-green/8 blur-[140px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            x: [0, -30, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-[50%] -right-60 w-[500px] h-[500px] rounded-full bg-emerald-800/6 blur-[120px]"
        />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full bg-brand-green/5 blur-[100px]" />
      </div>

      {/* ── Public Navbar ── */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image src="/logoDarkbg.png" alt="MindFuel" width={130} height={40} className="h-9 w-auto object-contain" priority />
          </Link>
          <div className="hidden md:flex items-center gap-7">
            {["Features", "About"].map((item) => (
              <a
                key={item}
                href={`/#${item.toLowerCase()}`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(item.toLowerCase())?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-[14px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {item}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={openSignInModal}
              className="text-[14px] font-semibold text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
            >
              Sign In
            </button>
            <button
              onClick={openSignInModal}
              className="flex items-center gap-2 px-4 py-2 bg-[#00a855] hover:bg-[#009950] text-white rounded-full font-bold text-[14px] transition-all hover:-translate-y-0.5 active:scale-95"
            >
              Get Started
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-center py-16">
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6 max-w-4xl"
        >
          Reflect.{" "}
          <span className="text-brand-green relative inline-block">
            Learn.
            <motion.span
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
              className="absolute bottom-0 left-0 h-[6px] bg-brand-green/30 rounded-full"
            />
          </span>{" "}
          Grow.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          MindFuel is a social journal where thoughtful people share lessons, reflections,
          and ideas that help them grow.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto"
        >
          <button
            onClick={openSignInModal}
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-4 bg-[#00a855] hover:bg-[#009950] text-white rounded-full font-bold text-[16px] transition-all hover:-translate-y-1 active:scale-95"
          >
            Start Reflecting
            <ArrowRight className="w-5 h-5" />
          </button>
          <Link
            href="/feed"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 border border-border/70 hover:border-border text-foreground rounded-full font-semibold text-[16px] transition-all hover:bg-secondary/40"
          >
            Explore Reflections
          </Link>
        </motion.div>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[13px] text-muted-foreground"
        >
          {["No algorithm", "No vanity metrics", "Just growth"].map((item) => (
            <span key={item} className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-brand-green flex-shrink-0" strokeWidth={2.5} />
              {item}
            </span>
          ))}
        </motion.div>
      </section>

      {/* ── Problem ── */}
      <section id="about" className="border-y border-border/50 bg-secondary/10 min-h-[85vh] flex flex-col justify-center py-20 px-4 sm:px-6 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
            className="text-3xl sm:text-4xl font-black tracking-tight mb-6"
          >
            Social media captures attention.<br />
            <span className="text-brand-green">Reflection creates growth.</span>
          </motion.h2>
          
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
            className="text-muted-foreground text-lg leading-relaxed mb-10 max-w-2xl mx-auto"
          >
            Most platforms encourage endless scrolling, reactions, and validation.
            MindFuel encourages thoughtful reflection, meaningful conversations, and personal growth.
          </motion.p>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid sm:grid-cols-2 gap-5 max-w-2xl mx-auto text-left text-[14px]"
          >
            <motion.div
              variants={fadeInUp}
              className="rounded-3xl border border-border/50 bg-background/40 backdrop-blur-sm p-6 space-y-3 hover:border-border/80 transition-colors"
            >
              <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground/50">Other platforms ask</p>
              <p className="text-muted-foreground/70 line-through text-base">&ldquo;What&apos;s happening?&rdquo;</p>
              <p className="text-muted-foreground/70 line-through text-base">&ldquo;What&apos;s on your mind?&rdquo;</p>
              <p className="text-muted-foreground/70 line-through text-base">&ldquo;Look at this photo&rdquo;</p>
            </motion.div>
            <motion.div
              variants={fadeInUp}
              className="rounded-3xl border border-brand-green/20 bg-brand-green/[0.03] backdrop-blur-sm p-6 space-y-3 shadow-[0_8px_32px_rgba(0,191,99,0.02)] hover:border-brand-green/40 transition-colors"
            >
              <p className="text-[11px] font-black uppercase tracking-wider text-brand-green/70">MindFuel asks</p>
              <p className="text-foreground font-bold text-base">&ldquo;What are you learning?&rdquo;</p>
              <p className="text-foreground font-bold text-base">&ldquo;What changed your mind?&rdquo;</p>
              <p className="text-foreground font-bold text-base">&ldquo;What did today teach you?&rdquo;</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 min-h-[85vh] flex flex-col justify-center py-20">
        <div className="text-center mb-18">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
            className="text-3xl sm:text-4xl font-black tracking-tight mb-4"
          >
            How it works
          </motion.h2>
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
            className="text-muted-foreground text-lg max-w-xl mx-auto"
          >
            Three simple steps to start building evidence of your growth.
          </motion.p>
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="grid md:grid-cols-3 gap-6 mt-14"
        >
          {HOW_IT_WORKS.map(({ icon: Icon, step, title, desc }) => (
            <motion.div
              key={step}
              whileHover="hover"
              initial="rest"
              variants={{
                ...fadeInUp,
                hover: cardHover.hover
              }}
              className="relative rounded-3xl border border-border/50 bg-secondary/20 p-8 cursor-pointer overflow-hidden group"
            >
              <div className="absolute top-6 right-6 text-[12px] font-black text-muted-foreground/20 tracking-widest">{step}</div>
              <div className="w-14 h-14 rounded-2xl bg-brand-green/10 border border-brand-green/20 flex items-center justify-center mb-6 group-hover:bg-brand-green/20 transition-colors">
                <Icon className="w-6 h-6 text-brand-green" strokeWidth={1.75} />
              </div>
              <h3 className="text-xl font-black mb-3">{title}</h3>
              <p className="text-muted-foreground text-[14px] leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Prompt Showcase ── */}
      <section className="border-y border-border/50 bg-secondary/5 min-h-[85vh] flex flex-col justify-center py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <motion.h2
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeInUp}
              className="text-3xl sm:text-4xl font-black tracking-tight mb-4"
            >
              Never wonder what to write.
            </motion.h2>
            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeInUp}
              className="text-muted-foreground text-lg max-w-xl mx-auto"
            >
              Every day, MindFuel surfaces a reflection prompt designed to spark genuine insight.
            </motion.p>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid sm:grid-cols-2 gap-6"
          >
            {PROMPTS.map(({ q, cat, color }) => (
              <motion.div
                key={q}
                variants={fadeInUp}
                whileHover={{ y: -6, scale: 1.01, transition: { duration: 0.2 } }}
                className="rounded-3xl border border-border/50 bg-background/60 p-7 group cursor-pointer hover:border-brand-green/25 hover:shadow-[0_12px_30px_rgba(0,191,99,0.02)] transition-all duration-300"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">{cat}</span>
                </div>
                <p className="text-[20px] sm:text-[22px] font-black leading-snug text-foreground mb-5 group-hover:text-brand-green transition-colors">
                  &ldquo;{q}&rdquo;
                </p>
                <button
                  onClick={openSignInModal}
                  className="inline-flex items-center gap-1.5 text-[14px] font-bold text-brand-green"
                >
                  Reflect on this <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Growth Timeline ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 min-h-[85vh] flex flex-col justify-center py-20">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
            className="space-y-6"
          >
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              See your growth<br /><span className="text-brand-green">over time.</span>
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Every reflection contributes to your personal growth history.
              MindFuel becomes more valuable the longer you use it.
            </p>
            <ul className="space-y-4">
              {["Reflection streaks", "Activity heatmaps", "Growth milestones", "Personal archive"].map((item, idx) => (
                <motion.li
                  initial={{ opacity: 0, x: -15 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1, duration: 0.4 }}
                  key={item}
                  className="flex items-center gap-3 text-[16px] font-bold"
                >
                  <CheckCircle2 className="w-5 h-5 text-brand-green flex-shrink-0" strokeWidth={2.5} />
                  {item}
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Visual card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="rounded-3xl border border-border/50 bg-secondary/10 p-8 space-y-6 relative overflow-hidden"
          >
            {/* Streak display */}
            <div className="flex items-center gap-4">
              <motion.div
                animate={{
                  y: [0, -6, 0],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="w-14 h-14 rounded-2xl bg-brand-green/10 border border-brand-green/20 flex items-center justify-center text-2xl"
              >
                🔥
              </motion.div>
              <div>
                <p className="font-black text-[22px] text-foreground">14-day streak</p>
                <p className="text-muted-foreground text-[13px] font-bold text-brand-green">Weekly Reflection Habit</p>
              </div>
            </div>

            {/* Mini heatmap */}
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground/50 mb-3">Reflection Activity</p>
              <div className="flex gap-1.5 flex-wrap">
                {Array.from({ length: 35 }).map((_, i) => {
                  const active = [2, 3, 5, 7, 8, 9, 12, 14, 15, 16, 17, 19, 21, 22, 23, 24, 25, 27, 28, 29, 30, 31, 32, 33, 34].includes(i);
                  return (
                    <motion.div
                      key={i}
                      initial={{ scale: 0.8, opacity: 0.5 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.01, duration: 0.3 }}
                      className="w-5 h-5 rounded-[4px]"
                      style={{ backgroundColor: active ? "rgba(0,168,85,0.6)" : "rgba(255,255,255,0.04)" }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Milestone badges */}
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground/50 mb-3">Growth Milestones</p>
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: "✨ First Spark", delay: 0.1 },
                  { label: "🔥 Consistent Reflector", delay: 0.2 },
                  { label: "💡 Insight Contributor", delay: 0.3 }
                ].map((b) => (
                  <motion.span
                    initial={{ scale: 0.8, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: b.delay, duration: 0.4 }}
                    key={b.label}
                    className="text-[12px] font-bold bg-brand-green/10 border border-brand-green/20 text-brand-green px-3.5 py-1.5 rounded-full"
                  >
                    {b.label}
                  </motion.span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Community ── */}
      <section className="border-y border-border/50 bg-secondary/5 min-h-[75vh] flex flex-col justify-center py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
            className="text-3xl sm:text-4xl font-black tracking-tight mb-4"
          >
            Join thoughtful people building better lives.
          </motion.h2>
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
            className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto"
          >
            MindFuel is home to people who believe growth is intentional.
          </motion.p>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="flex flex-wrap justify-center gap-3 mb-10"
          >
            {AUDIENCE.map((a) => (
              <motion.span
                variants={{
                  hidden: { opacity: 0, scale: 0.9 },
                  visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 200, damping: 15 } }
                }}
                whileHover={{ scale: 1.05 }}
                key={a}
                className="px-5 py-2.5 rounded-full border border-border/60 bg-secondary/40 text-[14px] font-bold text-foreground/80 cursor-default hover:text-brand-green hover:border-brand-green/30 transition-colors"
              >
                {a}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 min-h-[75vh] flex flex-col items-center justify-center text-center py-20 relative overflow-hidden">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
          className="space-y-6"
        >
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.1]">
            What is life teaching<br />you <span className="text-brand-green">today?</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-10">
            Join a community of reflective people documenting their growth — one insight at a time.
          </p>
          <button
            onClick={openSignInModal}
            className="inline-flex items-center gap-3 px-10 py-4 bg-[#00a855] hover:bg-[#009950] text-white rounded-full font-black text-[18px] transition-all hover:-translate-y-1 active:scale-95"
          >
            Start Reflecting
            <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/50 bg-secondary/10 py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-muted-foreground/40 font-medium tracking-wide">
            MindFuel · a{" "}
            <a href="https://lumynhq.studio" target="_blank" rel="noopener noreferrer" className="hover:text-brand-green transition-colors">
              Lumyn
            </a>{" "}
            product
          </p>
          <div className="flex items-center gap-6">
            {["about", "privacy", "terms", "cookies"].map((l) => {
              const isAbout = l === "about";
              return isAbout ? (
                <a
                  key={l}
                  href="#about"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById("about")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="text-[12px] font-bold text-muted-foreground/50 hover:text-brand-green transition-colors tracking-wide uppercase cursor-pointer"
                >
                  {l}
                </a>
              ) : (
                <Link
                  key={l}
                  href={`/${l}`}
                  className="text-[12px] font-bold text-muted-foreground/50 hover:text-brand-green transition-colors tracking-wide uppercase"
                >
                  {l}
                </Link>
              );
            })}
          </div>
        </div>
      </footer>
    </div>
  );
}
