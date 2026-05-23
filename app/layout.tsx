
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


const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.mind-fuel.app";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "MindFuel | Thoughtful Social Platform",
    template: "%s | MindFuel",
  },
  description:
    "MindFuel is a calm, intentional social platform to share your thoughts, curations, and ideas without the noise. Daily inspiration to fuel your mind and soul. Join thousands of thinkers sharing meaningful reflections.",
  keywords: [
    "mindfuel",
    "mindful social platform",
    "thought sharing",
    "daily inspiration",
    "mental wellness",
    "personal growth",
    "creative writing",
    "curated reflections",
    "intentional living",
    "mindfulness quotes",
    "thoughtful community",
    "productivity tips",
    "self improvement",
    "wellness blog",
  ],
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
    startupImage: "/logo.png",
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
    url: baseUrl,
    siteName: "MindFuel",
    title: "MindFuel — Fuel Your Mind Daily",
    description:
      "A calm, intentional space to share your thoughts, curations, and ideas. Join MindFuel and share what fuels your mind.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "MindFuel — Fuel Your Mind Daily",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MindFuel — Fuel Your Mind Daily",
    description:
      "A calm, intentional space to share your thoughts and ideas without the noise.",
    creator: "@mindfuelapp",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: baseUrl,
  },
  category: "social",
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
    "@type": "WebSite",
    name: "MindFuel",
    alternateName: "MindFuel by Lumyn",
    url: baseUrl,
    description:
      "A calm, intentional social platform to share your thoughts, curations, and ideas without the noise.",
    publisher: {
      "@type": "Organization",
      name: "Lumyn",
      url: "https://lumynhq.studio",
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/logo.png`,
      },
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${baseUrl}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
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
