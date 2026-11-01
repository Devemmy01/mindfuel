import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Lock, MessageSquareText, PenLine } from "lucide-react";
import GuestHomeHeader from "@/components/home/GuestHomeHeader";
import QuickComposer from "@/components/home/QuickComposer";
import ReflectionPreview, { splitPrompt } from "@/components/home/ReflectionPreview";
import { buttonVariants } from "@/components/ui/button";
import { getTodayPrompt } from "@/lib/dailyPrompts";
import { getInitialReflectionPosts } from "@/lib/initialFeed";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";
import type { PostType } from "@/types";
import {
  absoluteUrl,
  defaultOgImage,
  homeOgDescription,
  homeTitle,
  seoKeywords,
  siteDescription,
  siteUrl,
} from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = {
  title: {
    absolute: homeTitle,
  },
  description: siteDescription,
  keywords: seoKeywords,
  alternates: {
    canonical: absoluteUrl("/"),
    languages: {
      "en": absoluteUrl("/"),
      "x-default": absoluteUrl("/"),
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "MindFuel",
    title: homeTitle,
    description: homeOgDescription,
    url: absoluteUrl("/"),
    images: [
      {
        url: defaultOgImage,
        width: 1200,
        height: 630,
        alt: "MindFuel personal growth network — grow together through reflection",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: homeTitle,
    description: homeOgDescription,
    images: [defaultOgImage],
  },
};

function HomeJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${siteUrl}/#home`,
        url: siteUrl,
        name: homeTitle,
        description: siteDescription,
        inLanguage: "en",
        isPartOf: { "@id": `${siteUrl}/#website` },
        about: { "@id": `${siteUrl}/#app` },
        relatedLink: absoluteUrl("/about"),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

const STEPS = [
  { icon: MessageSquareText, title: "Pick a prompt", body: "Start from today's question, or shuffle for a different one." },
  { icon: PenLine, title: "Write a sentence or two", body: "No essays. One honest line about what today taught you is enough." },
  { icon: Lock, title: "Keep it private or share it", body: "Reflect just for yourself, or share it so others can learn from it too." },
];

async function loadPreview(): Promise<PostType[]> {
  try {
    // Prefer reflections with some substance; one-word answers don't show
    // a newcomer what the product is for. Fall back to the newest ones.
    const posts = (await getInitialReflectionPosts()).filter((post) => post.text?.trim());
    const substantive = posts.filter((post) => splitPrompt(post.text).body.trim().length >= 40);
    return [...substantive, ...posts.filter((post) => !substantive.includes(post))].slice(0, 3);
  } catch (error) {
    // The home page never waits on the database; the preview is optional.
    console.error("Home preview unavailable", error);
    return [];
  }
}

export default async function Home() {
  const prompt = getTodayPrompt();
  const preview = await loadPreview();

  return (
    <>
      <HomeJsonLd />
      <div className="min-h-dvh bg-background text-foreground">
        <GuestHomeHeader />
        <main className="mx-auto max-w-2xl px-4 pb-16">
          <section aria-labelledby="home-title" className="pt-8 sm:pt-14">
            <h1 id="home-title" className="text-h1 text-balance sm:text-display">
              Write one honest reflection a day.{" "}
              <span className="text-muted-foreground">Read what others learned.</span>
            </h1>
            <p className="mt-3 text-body text-muted-foreground">
              MindFuel is a calm place to think out loud. Answer today&apos;s prompt in a sentence or two,
              then see how others answered it.
            </p>
            <div className="mt-6">
              <QuickComposer initialPrompt={{ id: prompt.id, question: prompt.question }} />
            </div>
            <p className="mt-3 text-center text-caption text-muted-foreground">
              New here?{" "}
              <a href="#how" className="font-semibold text-foreground underline-offset-4 hover:underline">
                How it works
              </a>
            </p>
          </section>

          <section id="how" aria-labelledby="how-title" className="scroll-mt-20 pt-14">
            <h2 id="how-title" className="text-h2">How it works</h2>
            <ol className="mt-4 grid gap-3 sm:grid-cols-3">
              {STEPS.map(({ icon: Icon, title, body }, index) => (
                <li key={title} className="rounded-card border border-line bg-surface p-4">
                  <span className="flex items-center gap-2 text-micro font-semibold text-subtle-foreground">
                    <span className="flex size-6 items-center justify-center rounded-full bg-surface-elevated text-foreground tabular-nums">
                      {index + 1}
                    </span>
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <h3 className="mt-3 text-body font-semibold">{title}</h3>
                  <p className="mt-1 text-caption text-muted-foreground">{body}</p>
                </li>
              ))}
            </ol>
          </section>

          {preview.length > 0 ? (
            <section aria-labelledby="preview-title" className="pt-14">
              <div className="flex items-end justify-between gap-3">
                <h2 id="preview-title" className="text-h2">Recent {copy.nounPlural}</h2>
                <Link href="/feed" className="text-caption font-semibold text-primary-text hover:underline">
                  Browse all
                </Link>
              </div>
              <div className="mt-4 grid gap-3">
                {preview.map((post) => (
                  <ReflectionPreview key={post._id} post={post} />
                ))}
              </div>
              <Link href="/feed" className={cn(buttonVariants({ variant: "secondary", block: true }), "mt-4")}>
                Read more {copy.nounPlural} <ArrowRight aria-hidden />
              </Link>
            </section>
          ) : null}
        </main>
        <footer className="border-t border-line">
          <nav aria-label="About MindFuel" className="mx-auto flex max-w-2xl flex-wrap gap-x-5 gap-y-2 px-4 py-6 text-caption text-muted-foreground">
            <Link href="/about" className="hover:text-foreground">About</Link>
            <Link href="/guides" className="hover:text-foreground">Guides</Link>
            <Link href="/terms#community-guidelines" className="hover:text-foreground">Community guidelines</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
          </nav>
        </footer>
      </div>
    </>
  );
}
