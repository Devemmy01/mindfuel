
import type React from "react";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientProviders } from "@/providers/ClientProviders";
import { Analytics } from "@vercel/analytics/react";
import InstallPWA from "@/components/InstallPWA";
import LayoutContent from "@/components/LayoutContent";
import OfflineNotice from "@/components/OfflineNotice";
import ClientBadgeUpdater from "@/components/ClientBadgeUpdater";
import {
  absoluteUrl,
  defaultOgImage,
  seoKeywords,
  siteDescription,
  siteName,
  siteUrl,
} from "@/lib/seo";


const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: "MindFuel: Daily Reflection & Personal Growth App",
    template: "%s | MindFuel",
  },
  description: siteDescription,
  keywords: seoKeywords,
  authors: [{ name: "Lumyn", url: "https://lumynhq.studio" }],
  creator: "Lumyn",
  publisher: "Lumyn",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MindFuel",
    startupImage: "/splash-logo.png",
  },
  formatDetection: { telephone: false },
  icons: {
    apple: "/icon-192.png",
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/icon-192.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName,
    title: "MindFuel — Grow Together Through Reflection",
    description: siteDescription,
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
    title: "MindFuel — Grow Together Through Reflection",
    description: siteDescription,
    creator: "@mindfuelapp",
    images: [defaultOgImage],
  },
  alternates: {
    canonical: siteUrl,
  },
  category: "social",
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9fafb" },
    { media: "(prefers-color-scheme: dark)", color: "#111827" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

// JSON-LD structured data
function JsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: siteName,
        url: siteUrl,
        logo: {
          "@type": "ImageObject",
          url: absoluteUrl("/splash-logo.png"),
        },
        sameAs: ["https://twitter.com/mindfuelapp"],
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: siteName,
        alternateName: ["MindFuel Personal Growth Network", "MindFuel Reflection Community"],
        url: siteUrl,
        description: siteDescription,
        publisher: {
          "@id": `${siteUrl}/#organization`,
        },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${siteUrl}/search?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "WebApplication",
        "@id": `${siteUrl}/#app`,
        name: siteName,
        url: siteUrl,
        applicationCategory: "LifestyleApplication",
        applicationSubCategory: "Personal growth and reflection",
        operatingSystem: "Web, iOS, Android",
        description: siteDescription,
        isAccessibleForFree: true,
        browserRequirements: "Requires JavaScript and a modern web browser",
        featureList: [
          "Daily reflection prompts",
          "Private and shared reflections",
          "Personal reflection archive",
          "Meaningful community conversations",
          "Reflection streaks and growth milestones",
          "Saved lessons and ideas",
        ],
        screenshot: {
          "@type": "ImageObject",
          url: defaultOgImage,
          width: 1200,
          height: 630,
        },
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
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


export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Inter is loaded via next/font — no extra stylesheet needed */}
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <JsonLd />
      </head>
      <body
        className={`${inter.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <ClientProviders>
          {/* Top accent line */}
          <div className="brand-accent-line" />
          <LayoutContent>{children}</LayoutContent>
          <ClientBadgeUpdater />
          <InstallPWA />
          <OfflineNotice />
          <Analytics />
        </ClientProviders>
      </body>
    </html>
  );
}
