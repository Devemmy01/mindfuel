import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "../src/components/theme-provider";
import Navbar from "../components/nav";
import Provider from "../components/provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MindFuel - Daily Inspiration",
  description: "Daily inspiration to fuel your mind and soul",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Provider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Navbar />
            {children}
          </ThemeProvider>
        </Provider>
      </body>
    </html>
  );
}
