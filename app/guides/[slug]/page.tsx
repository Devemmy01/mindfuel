import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { getGuide, guides } from "@/lib/guides";
import { absoluteUrl, defaultOgImage, siteName } from "@/lib/seo";

interface GuidePageProps { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return guides.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const guide = getGuide((await params).slug);
  if (!guide) return { title: "Guide not found", robots: { index: false, follow: false } };
  return {
    title: guide.seoTitle,
    description: guide.description,
    alternates: { canonical: absoluteUrl(`/guides/${guide.slug}`) },
    openGraph: {
      type: "article",
      title: guide.seoTitle,
      description: guide.description,
      url: absoluteUrl(`/guides/${guide.slug}`),
      publishedTime: guide.updatedAt,
      modifiedTime: guide.updatedAt,
      images: [defaultOgImage],
    },
    twitter: { card: "summary_large_image", title: guide.seoTitle, description: guide.description, images: [defaultOgImage] },
  };
}

export default async function GuidePage({ params }: GuidePageProps) {
  const guide = getGuide((await params).slug);
  if (!guide) notFound();
  const related = guides.filter(({ slug }) => slug !== guide.slug);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: guide.seoTitle,
        description: guide.description,
        datePublished: guide.updatedAt,
        dateModified: guide.updatedAt,
        mainEntityOfPage: absoluteUrl(`/guides/${guide.slug}`),
        author: { "@type": "Organization", name: siteName, url: absoluteUrl("/") },
        publisher: { "@type": "Organization", name: siteName, logo: { "@type": "ImageObject", url: absoluteUrl("/splash-logo.png") } },
        image: defaultOgImage,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "Guides", item: absoluteUrl("/guides") },
          { "@type": "ListItem", position: 3, name: guide.seoTitle, item: absoluteUrl(`/guides/${guide.slug}`) },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#020604] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="border-b border-white/[0.07]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" aria-label="MindFuel home"><Image src="/logoDarkbg.png" alt="MindFuel" width={132} height={40} className="h-9 w-auto" /></Link>
          <Link href="/guides" className="inline-flex items-center gap-2 text-sm font-bold text-white/60 hover:text-white"><ArrowLeft className="h-4 w-4" /> All guides</Link>
        </div>
      </header>
      <main>
        <article className="mx-auto max-w-3xl px-5 pb-20 pt-16 sm:px-8 sm:pt-24">
          <nav aria-label="Breadcrumb" className="mb-8 text-xs font-semibold text-white/35"><Link href="/" className="hover:text-white">Home</Link> <span className="px-2">/</span> <Link href="/guides" className="hover:text-white">Guides</Link></nav>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-green">{guide.eyebrow} · {guide.readTime}</p>
          <h1 className="mt-5 text-4xl font-black leading-[1.02] tracking-[-0.045em] sm:text-6xl">{guide.title}</h1>
          <p className="mt-7 text-xl leading-8 text-white/60">{guide.intro}</p>
          <p className="mt-5 text-xs text-white/30">Updated <time dateTime={guide.updatedAt}>June 23, 2026</time></p>

          <div className="mt-14 space-y-14">
            {guide.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-3xl font-black tracking-[-0.03em]">{section.heading}</h2>
                {section.paragraphs?.map((paragraph) => <p key={paragraph} className="mt-5 text-[17px] leading-8 text-white/65">{paragraph}</p>)}
                {section.bullets && <ul className="mt-6 space-y-3">{section.bullets.map((bullet) => <li key={bullet} className="flex gap-3 text-[16px] leading-7 text-white/65"><Check className="mt-1.5 h-4 w-4 shrink-0 text-brand-green" /><span>{bullet}</span></li>)}</ul>}
                {section.prompts && <ol className="mt-6 grid gap-3 sm:grid-cols-2">{section.prompts.map((prompt, index) => <li key={prompt} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 text-[15px] leading-6 text-white/70"><span className="mb-2 block text-[10px] font-black text-brand-green">{String(index + 1).padStart(2, "0")}</span>{prompt}</li>)}</ol>}
              </section>
            ))}
          </div>

          <aside className="mt-16 rounded-[2rem] border border-brand-green/20 bg-brand-green/10 p-7 sm:p-9">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-green">Put it into practice</p>
            <h2 className="mt-3 text-2xl font-black">Keep the lesson while it is alive.</h2>
            <p className="mt-3 leading-7 text-white/55">MindFuel gives you thoughtful prompts and a calm place to reflect privately or learn with others.</p>
            <Link href="/?view=landing" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#00a855] px-5 py-3 text-sm font-black text-white">Explore MindFuel <ArrowRight className="h-4 w-4" /></Link>
          </aside>
        </article>

        <section className="border-t border-white/[0.07] px-5 py-16 sm:px-8">
          <div className="mx-auto max-w-5xl"><h2 className="text-2xl font-black">Keep learning</h2><div className="mt-6 grid gap-4 md:grid-cols-2">{related.map((item) => <Link key={item.slug} href={`/guides/${item.slug}`} className="group rounded-2xl border border-white/[0.08] p-5 transition hover:border-brand-green/25"><p className="text-xs font-black uppercase tracking-wider text-brand-green">{item.eyebrow}</p><h3 className="mt-2 text-lg font-black">{item.title}</h3><span className="mt-4 inline-flex items-center gap-2 text-sm text-white/45 group-hover:text-white">Read guide <ArrowRight className="h-4 w-4" /></span></Link>)}</div></div>
        </section>
      </main>
    </div>
  );
}
