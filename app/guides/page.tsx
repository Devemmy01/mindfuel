import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { absoluteUrl, defaultOgImage, siteDescription, siteName } from "@/lib/seo";
import { guides } from "@/lib/guides";

export const metadata: Metadata = {
  title: "Personal Growth & Daily Reflection Guides",
  description:
    "Practical, thoughtful guides to daily reflection, journaling, self-awareness, and sustainable personal growth from MindFuel.",
  alternates: { canonical: absoluteUrl("/guides") },
  openGraph: {
    type: "website",
    title: "MindFuel Guides: Reflection That Changes How You Live",
    description: "Practical guides for reflection, journaling, and personal growth.",
    url: absoluteUrl("/guides"),
    siteName,
    images: [{ url: defaultOgImage, width: 1200, height: 630, alt: "MindFuel personal growth and reflection guides" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Personal Growth & Daily Reflection Guides | MindFuel",
    description: "Practical guides for reflection, journaling, self-awareness, and sustainable personal growth.",
    images: [defaultOgImage],
  },
};

export default function GuidesPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${absoluteUrl("/guides")}#collection`,
        url: absoluteUrl("/guides"),
        name: "Personal Growth & Daily Reflection Guides",
        description: siteDescription,
        inLanguage: "en",
        isPartOf: { "@id": `${absoluteUrl("/")}#website` },
        mainEntity: { "@id": `${absoluteUrl("/guides")}#list` },
      },
      {
        "@type": "ItemList",
        "@id": `${absoluteUrl("/guides")}#list`,
        numberOfItems: guides.length,
        itemListElement: guides.map((guide, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: guide.title,
          url: absoluteUrl(`/guides/${guide.slug}`),
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "Guides", item: absoluteUrl("/guides") },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-surface text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="border-b border-line-subtle">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" aria-label="MindFuel home">
            <Image src="/logoDarkbg.png" alt="MindFuel" width={132} height={40} className="h-9 w-auto" />
          </Link>
          <Link href="/" className="text-sm font-bold text-white/60 transition hover:text-white">Explore MindFuel</Link>
        </div>
      </header>
      <main>
        <section className="mx-auto max-w-6xl px-5 pb-16 pt-20 sm:px-8 sm:pt-28">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-green/20 bg-brand-green/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-brand-green">
            <BookOpen className="h-3.5 w-3.5" /> MindFuel Guides
          </div>
          <h1 className="max-w-4xl text-5xl font-black leading-[0.98] tracking-[-0.05em] sm:text-7xl">Reflection that changes how you live.</h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-white/55">Practical ideas, questions, and methods for turning everyday experience into clearer choices and lasting personal growth.</p>
        </section>
        <section className="mx-auto grid max-w-6xl gap-4 px-5 pb-24 sm:px-8 md:grid-cols-2">
          {guides.map((guide, index) => (
            <article key={guide.slug} className={`group rounded-[2rem] border border-line-subtle bg-white/[0.025] p-7 transition hover:-translate-y-1 hover:border-brand-green/25 hover:bg-brand-green/[0.035] sm:p-9 ${index === 0 ? "md:col-span-2" : ""}`}>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-green">{guide.eyebrow} · {guide.readTime}</p>
              <h2 className="mt-5 max-w-3xl text-3xl font-black leading-tight tracking-[-0.035em] sm:text-4xl">{guide.title}</h2>
              <p className="mt-4 max-w-2xl leading-7 text-white/50">{guide.description}</p>
              <Link href={`/guides/${guide.slug}`} className="mt-8 inline-flex items-center gap-2 text-sm font-black text-white">Read the guide <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></Link>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
