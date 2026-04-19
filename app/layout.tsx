import type React from "react";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";
import { AuthProvider } from "@/providers/AuthProvider";
import Navbar from "@/components/Navbar";
import SearchUsers from "@/components/SearchUsers";
import MindfulSaves from "@/components/MindfulSaves";
import MindfulTip from "@/components/MindfulTip";
import { ToastProvider } from "@/providers/ToastProvider";
import InstallPWA from "@/components/InstallPWA";
import { Analytics } from "@vercel/analytics/react";


// Google Fonts for card font picker
const CARD_FONTS_URL =
  "https://fonts.googleapis.com/css2?" +
  "family=Playfair+Display:wght@400;600;700;900" +
  "&family=Lora:wght@400;600;700" +
  "&family=Raleway:wght@400;600;700;800" +
  "&family=Montserrat:wght@400;600;700;800" +
  "&family=Space+Grotesk:wght@400;600;700" +
  "&family=DM+Serif+Display:ital@0;1" +
  "&family=Cormorant+Garamond:wght@400;600;700" +
  "&family=Merriweather:wght@400;700;900" +
  "&family=Poppins:wght@400;600;700;800" +
  "&family=Crimson+Text:wght@400;600;700" +
  "&family=Josefin+Sans:wght@400;600;700" +
  "&family=Abril+Fatface" +
  "&family=Dancing+Script:wght@400;600;700" +
  "&display=swap";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://mindfuel.app";

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
    "thoughts",
    "reflections",
    "social platform",
    "inspiration",
    "mindfulness",
    "quotes",
    "daily motivation",
    "intentional living",
    "thought sharing",
    "curated thoughts",
    "mental wellness",
    "creative writing",
    "personal growth",
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
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "MindFuel Logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "MindFuel — Fuel Your Mind Daily",
    description:
      "A calm, intentional space to share your thoughts and ideas without the noise.",
    images: ["/logo.png"],
    creator: "@mindfuelapp",
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
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Load card fonts */}
        <link href={CARD_FONTS_URL} rel="stylesheet" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <JsonLd />
      </head>
      <body
        className={`${inter.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <AuthProvider>
          <ToastProvider>
              {/* Top accent line */}
              <div className="brand-accent-line" />

              <div className="min-h-screen bg-background text-foreground selection:bg-brand-green/20 flex justify-center">
                <div className="flex w-full max-w-[1280px] relative">

                  {/* ── Left Sidebar (Navbar) ── */}
                  <Navbar />

                  {/* ── Main Feed Column ── */}
                  <main className="flex-grow w-full min-w-0 md:max-w-[600px] md:border-x md:border-border min-h-[100dvh]">
                    {children}
                  </main>


                  {/* ── Right Rail (lg+) ── */}
                  <aside className="hidden lg:flex flex-col w-[350px] shrink-0 sticky top-0 h-screen py-6 pl-8 pr-4 overflow-y-auto no-scrollbar scroll-smooth">
                    
                    {/* Search */}
                    <SearchUsers />
                    
                    {/* Mindful Tip */}
                    <MindfulTip />

                    {/* Saved Reflections */}
                    <MindfulSaves />

                    {/* Subdued Footer */}
                    <footer className="mt-auto pt-10 pb-6 px-2 flex flex-col gap-4">
                      <div className="flex flex-wrap gap-x-5 gap-y-2">
                        {["About", "Privacy", "Terms", "Cookies"].map((l) => (
                          <Link href={`/${l.toLowerCase()}`} key={l} className="text-[11px] font-bold text-muted-foreground hover:text-brand-green transition-colors tracking-wide uppercase opacity-70 hover:opacity-100">
                            {l}
                          </Link>
                        ))}
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-5 h-5 bg-foreground/5 rounded-md flex items-center justify-center">
                           <Image src="/logo.png" alt="" width={20} height={20} />
                        </div>
                        <p className="text-[13px] font-bold text-muted-foreground opacity-50 tracking-wide pt-1">
                          MindFuel - a <a href="http://lumynhq.studio" className="text-brand-green underline">Lumyn</a> product.
                        </p>
                      </div>
                      <a href="https://fazier.com/launches/www.mind-fuel.app" target="_blank"><img src="https://fazier.com/api/v1//public/badges/launch_badges.svg?badge_type=launched&theme=dark" width="120" alt="Fazier badge" /></a>
                    </footer>
                  </aside>

                </div>
              </div>
            <InstallPWA />
            <Analytics />

          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
