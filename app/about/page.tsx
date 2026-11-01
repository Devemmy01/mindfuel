import type { Metadata } from "next";
import LandingPage from "@/components/LandingPage";
import {
  absoluteUrl,
  defaultOgImage,
  homeOgDescription,
  landingFaqs,
  seoKeywords,
  siteDescription,
  siteUrl,
} from "@/lib/seo";

const aboutTitle = "About MindFuel: Daily Reflection App & Personal Growth Community";

export const metadata: Metadata = {
  title: { absolute: aboutTitle },
  description: siteDescription,
  keywords: seoKeywords,
  alternates: {
    canonical: absoluteUrl("/about"),
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "MindFuel",
    title: aboutTitle,
    description: homeOgDescription,
    url: absoluteUrl("/about"),
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
    title: aboutTitle,
    description: homeOgDescription,
    images: [defaultOgImage],
  },
};

function AboutJsonLd() {
  // The FAQ markup lives here because this is the page that shows the FAQ.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AboutPage",
        "@id": `${siteUrl}/about#page`,
        url: absoluteUrl("/about"),
        name: aboutTitle,
        description: siteDescription,
        inLanguage: "en",
        isPartOf: { "@id": `${siteUrl}/#website` },
        about: { "@id": `${siteUrl}/#app` },
      },
      {
        "@type": "FAQPage",
        "@id": `${siteUrl}/about#faq`,
        mainEntity: landingFaqs.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
  );
}

export default function AboutPage() {
  return (
    <>
      <AboutJsonLd />
      <LandingPage />
    </>
  );
}
