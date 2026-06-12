import type { Metadata } from "next";
import LandingPage from "@/components/LandingPage";
import {
  absoluteUrl,
  defaultOgImage,
  landingFaqs,
  seoKeywords,
  siteDescription,
  siteUrl,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: "Social Journal & Daily Reflection App",
  description: siteDescription,
  keywords: seoKeywords,
  alternates: {
    canonical: absoluteUrl("/"),
  },
  openGraph: {
    title: "MindFuel - Social Journal & Daily Reflection App",
    description: siteDescription,
    url: absoluteUrl("/"),
    images: [
      {
        url: defaultOgImage,
        width: 1200,
        height: 630,
        alt: "MindFuel social journal and reflection app",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MindFuel - Social Journal & Daily Reflection App",
    description: siteDescription,
    images: [defaultOgImage],
  },
};

function HomeJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${siteUrl}/#faq`,
    mainEntity: landingFaqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default function Home() {
  return (
    <>
      <HomeJsonLd />
      <LandingPage />
    </>
  );
}
