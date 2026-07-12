import type { Metadata } from "next";
import LandingPage from "@/components/LandingPage";
import {
  absoluteUrl,
  defaultOgImage,
  homeOgDescription,
  homeTitle,
  landingFaqs,
  seoKeywords,
  siteDescription,
  siteUrl,
} from "@/lib/seo";

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
      },
      {
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

export default function Home() {
  return (
    <>
      <HomeJsonLd />
      <LandingPage />
    </>
  );
}
