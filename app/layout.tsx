import type React from "react";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/providers/AuthProvider";
import Navbar from "@/components/Navbar";
import SearchUsers from "@/components/SearchUsers";
import MindfulSaves from "@/components/MindfulSaves";
import MindfulTip from "@/components/MindfulTip";
import { ToastProvider } from "@/providers/ToastProvider";


const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MindFuel - Fuel Your Mind Daily",
  description: "A calm, intentional space to share your thoughts, curations, and ideas without the noise.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MindFuel",
  },
  formatDetection: { telephone: false },
  icons: {
    apple: "/logoWhitebg.png",
    icon: "/logo.png",
  },
  openGraph: {
    title: "MindFuel - Fuel Your Mind Daily",
    description: "A calm, intentional space to share your thoughts, curations, and ideas without the noise.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#111827",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};



export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
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
                        <button key={l} className="text-[11px] font-bold text-muted-foreground hover:text-brand-green transition-colors tracking-wide uppercase opacity-70 hover:opacity-100">
                          {l}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-5 h-5 bg-foreground/5 rounded-md flex items-center justify-center">
                         <img src="/logo.png" alt="" className="w-3 h-3" />
                      </div>
                      <p className="text-[11px] font-bold text-muted-foreground opacity-50 tracking-wide uppercase">
                        MindFuel - a <a href="http://lumynhq.studio" className="text-brand-green underline">Lumyn</a> product.
                      </p>
                    </div>
                  </footer>
                </aside>

              </div>
            </div>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
