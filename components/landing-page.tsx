"use client";

import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import {
  ArrowRight,
  BookOpen,
  Brain,
  Heart,
  Lightbulb,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingPage() {
  const { theme } = useTheme();

  return (
    <>
      <div className="flex max-w-6xl mx-auto min-h-screen flex-col">
        <main className="flex-1">
          {/* Hero Section */}
          <section className="py-20 md:py-32 flex flex-col items-center text-center relative">
            <div className="absolute inset-0">
              {/* Dark theme gradient */}
              <div className={`${theme === "dark" ? "block" : "hidden"}`}>
                <div className="absolute top-0 left-0 w-full h-full bg-[#00bf63]/10 rounded-full blur-3xl opacity-30"></div>
                <div className="absolute bottom-0 right-0 w-full h-full bg-[#00bf63]/10 rounded-full blur-3xl opacity-20"></div>
              </div>

              {/* Light theme gradient */}
              <div className={`${theme === "dark" ? "hidden" : "block"}`}>
                <div className="absolute top-0 left-0 w-full h-full bg-[#00bf63]/5 rounded-full blur-3xl opacity-40"></div>
                <div className="absolute bottom-0 right-0 w-full h-full bg-[#00bf63]/5 rounded-full blur-3xl opacity-30"></div>
              </div>
            </div>

            {/* Content with z-index to keep above background elements */}
            <div className="relative z-10 max-w-4xl mx-auto px-4">
              <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium mb-8">
                <span className="text-[#00bf63] font-semibold flex">
                  <Sparkles className="h-4 w-4 text-[#00bf63] mr-2" /> 100% Free
                </span>
              </div>

              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 max-w-3xl mx-auto">
                Daily inspiration to fuel your{" "}
                <span className="text-[#00bf63]">mind</span> and{" "}
                <span className="text-[#00bf63]">soul</span>
              </h1>

              <p className="text-base md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                MindFuel delivers personalized motivational quotes to help you
                stay inspired, focused, and positive throughout your day.
              </p>

              <div className="max-w-md mx-auto">
                <Button
                  size="lg"
                  className="gap-2 w-full bg-[#00bf63] hover:bg-[#00bf63]/90 text-white cursor-pointer h-12 rounded-xl"
                >
                  Begin Your Mindful Journey <ArrowRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-6 text-sm text-muted-foreground">
                Be one of the first to improve your wellbeing
              </div>
            </div>
          </section>

          {/* Bento Grid Features */}
          <section id="features" className="py-5">
            <div className="max-w-6xl mx-auto px-4">
              <div className="text-center mb-16">
                <div className="inline-flex items-center rounded-full border border-[#00bf63]/30 bg-[#00bf63]/5 px-4 py-1.5 text-sm font-medium mb-4">
                  <Sparkles className="h-4 w-4 text-[#00bf63] mr-2" />
                  <span className="text-[#00bf63]">Features</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Designed to nourish your mind, daily
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Our thoughtfully crafted features work together to provide a
                  comprehensive wellbeing experience
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Feature */}
                <div className="col-span-1 md:col-span-2 row-span-2 bg-primary/5 rounded-3xl p-8 flex flex-col justify-between overflow-hidden group border border-primary/10 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#00bf63]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative z-10">
                    <div className="inline-flex items-center justify-center p-3 bg-[#00bf63]/10 rounded-xl mb-6">
                      <Lightbulb className="h-8 w-8 text-[#00bf63]" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3">
                      Daily Personalized Quotes
                    </h3>
                    <p className="text-muted-foreground mb-6 max-w-lg">
                      Our AI-powered system delivers inspiration tailored
                      specifically for you. Each quote is selected based on your
                      preferences, current goals, and emotional state to provide
                      the perfect dose of motivation when you need it most.
                    </p>
                    <div className="flex items-center text-sm text-[#00bf63] font-medium mb-6">
                      <span>Learn more</span>
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </div>
                  </div>
                  <div className="bg-background rounded-xl shadow-lg p-4 border border-border">
                    <Image
                      src="/placeholder.svg?height=300&width=600"
                      alt="Personalized quotes dashboard"
                      width={600}
                      height={300}
                      className="rounded-lg"
                    />
                  </div>
                </div>

                {/* Feature 2 */}
                <div className="bg-card rounded-3xl p-6 hover:shadow-md transition-all duration-300 hover:border-[#00bf63]/20 border border-border group">
                  <div className="inline-flex items-center justify-center p-3 bg-[#00bf63]/10 rounded-xl mb-4">
                    <Brain className="h-6 w-6 text-[#00bf63]" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Mood Tracking</h3>
                  <p className="text-muted-foreground mb-4">
                    Visualize your emotional journey with intuitive charts and
                    insights. Discover patterns in how different quotes affect
                    your wellbeing over time.
                  </p>
                  <div className="flex items-center text-sm text-muted-foreground font-medium group-hover:text-[#00bf63] transition-colors">
                    <span>Explore feature</span>
                    <ArrowRight className="h-4 w-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>

                {/* Feature 3 */}
                <div className="bg-card rounded-3xl p-6 hover:shadow-md transition-all duration-300 hover:border-[#00bf63]/20 border border-border group">
                  <div className="inline-flex items-center justify-center p-3 bg-[#00bf63]/10 rounded-xl mb-4">
                    <BookOpen className="h-6 w-6 text-[#00bf63]" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Quote Collections</h3>
                  <p className="text-muted-foreground mb-4">
                    Create personalized libraries of your favorite quotes,
                    organized by themes, emotions, or goals. Access them anytime
                    for instant inspiration.
                  </p>
                  <div className="flex items-center text-sm text-muted-foreground font-medium group-hover:text-[#00bf63] transition-colors">
                    <span>Explore feature</span>
                    <ArrowRight className="h-4 w-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>

                {/* Feature 4 */}
                <div className="bg-card rounded-3xl p-6 hover:shadow-md transition-all duration-300 hover:border-[#00bf63]/20 border border-border group">
                  <div className="inline-flex items-center justify-center p-3 bg-[#00bf63]/10 rounded-xl mb-4">
                    <Zap className="h-6 w-6 text-[#00bf63]" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Daily Challenges</h3>
                  <p className="text-muted-foreground mb-4">
                    Transform inspiration into action with bite-sized daily
                    challenges. Build positive habits and track your progress as
                    you grow.
                  </p>
                  <div className="flex items-center text-sm text-muted-foreground font-medium group-hover:text-[#00bf63] transition-colors">
                    <span>Explore feature</span>
                    <ArrowRight className="h-4 w-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>

                {/* Feature 5 */}
                <div className="col-span-1 md:col-span-2 bg-card rounded-3xl p-6 hover:shadow-md transition-all duration-300 hover:border-[#00bf63]/20 border border-border group">
                  <div className="inline-flex items-center justify-center p-3 bg-[#00bf63]/10 rounded-xl mb-4">
                    <Heart className="h-6 w-6 text-[#00bf63]" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Community Sharing</h3>
                  <p className="text-muted-foreground mb-4">
                    Amplify positivity by sharing quotes with friends or the
                    MindFuel community. Discover how others find inspiration and
                    engage in meaningful conversations.
                  </p>
                  <div className="flex items-center text-sm text-muted-foreground font-medium group-hover:text-[#00bf63] transition-colors">
                    <span>Explore feature</span>
                    <ArrowRight className="h-4 w-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-20 text-center mx-4">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold mb-4">
                Ready to fuel your mind?
              </h2>
              <p className="text-base md:text-xl text-muted-foreground mb-8">
                Join thousands of people who start their day with MindFuel.
                It&apos;s 100% free, forever.
              </p>
              <Button
                size="lg"
                className="gap-2 bg-[#00bf63] hover:bg-[#00bf63]/90 text-white cursor-pointer"
              >
                Get Started <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </section>
        </main>

        <footer className="border-t py-12">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center gap-2 mb-4 md:mb-0">
                <Image
                  src={
                    theme === "dark" ? "/logoDarkbg.png" : "/logoWhitebg.png"
                  }
                  alt="MindFuel Logo"
                  width={160}
                  height={70}
                  priority
                />
              </div>
              <div className="flex gap-8">
                <Link
                  href="#"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Privacy
                </Link>
                <Link
                  href="#"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Terms
                </Link>
                <Link
                  href="#"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Contact
                </Link>
              </div>
            </div>
            <div className="mt-8 text-center text-sm text-muted-foreground">
              © {new Date().getFullYear()} MindFuel. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
