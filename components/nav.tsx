"use client";

import React, { useState, useEffect } from "react";
import { ThemeToggle } from "../components/themetoggle";
import { useTheme } from "next-themes";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import {
  signIn,
  signOut,
  useSession,
  getProviders,
  ClientSafeProvider,
} from "next-auth/react";

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isUserLoggedIn = true;
  const [providers, setProviders] = useState<Record<
    string,
    ClientSafeProvider
  > | null>(null);

  useEffect(() => {
    const fetchProviders = async () => {
      const response = await getProviders();
      setProviders(response);
    };
    fetchProviders();
  }, []);

  // Handle scroll detection for header changes
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [scrolled]);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <>
      <nav
        className={`sticky top-5 z-50 max-w-6xl mx-auto ${
          scrolled
            ? `${
                theme === "dark" ? "bg-black/50" : "bg-white/50"
              } backdrop-blur-md shadow-sm mx-auto px-4 sm:px-6 lg:px-8 max-w-[90%] md:max-w-3xl lg:max-w-5xl rounded-xl transition-all duration-600 ease-in-out`
            : "bg-transparent px-4 sm:px-6 lg:px-8"
        }`}
      >
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 w-36">
            <Image
              src={theme === "dark" ? "/logoDarkbg.png" : "/logoWhitebg.png"}
              alt="MindFuel Logo"
              width={160}
              height={70}
              priority
            />
          </div>

          <div className="flex items-center md:hidden">
            <div className="md:hidden">
              <ThemeToggle />
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <div
                className={`w-6 h-6 relative mr-3 ${
                  mobileMenuOpen ? "" : "top-[10px]"
                }`}
              >
                <span
                  className={`absolute h-0.5 w-3 left-[18px] bg-current transform transition duration-300 ease-in-out ${
                    mobileMenuOpen
                      ? "rotate-45 translate-y-2.5 w-6 left-0"
                      : "-translate-y-1.5"
                  }`}
                />
                <span
                  className={`absolute h-0.5 w-6 bg-current transform transition duration-300 ease-in-out ${
                    mobileMenuOpen ? "opacity-0" : "opacity-100"
                  }`}
                />
                <span
                  className={`absolute h-0.5 w-3 left-[18px] bg-current transform transition duration-300 ease-in-out ${
                    mobileMenuOpen
                      ? "-rotate-45 translate-y-2.5 w-6 left-0"
                      : "translate-y-1.5"
                  }`}
                />
              </div>
            </button>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center justify-center flex-1">
            <div
              className={`flex items-center ${
                scrolled ? "gap-10" : "gap-5 lg:gap-20"
              }`}
            >
              <Link
                href="#features"
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Explore
              </Link>
              <Link
                href="#features"
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Features
              </Link>
              <Link
                href="#testimonials"
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Support
              </Link>
            </div>
          </nav>

          <div className="hidden md:flex items-center gap-2 md:gap-4 w-40 justify-end">
            <ThemeToggle />
            {isUserLoggedIn ? (
              <div className="flex items-center gap-4">
                <Button
                  asChild
                  className="bg-[#00bf63] text-white hover:bg-[#00bf63]/90"
                >
                  <Link href="#">Create post</Link>
                </Button>
                <Button
                  asChild
                  className="border hover:bg-[#00bf63] hover:text-white hover:border-none"
                >
                  <Link href="#">Sign Out</Link>
                </Button>
                <Link
                  href="/profile"
                  className="text-sm font-medium hover:text-primary transition-colors"
                >
                  <User className="h-5 w-5 text-gray-300" />
                  {/* <Image src="/profile.png" alt="Profile" width={30} height={30} /> */}
                </Link>
              </div>
            ) : (
              <>
                {providers &&
                  Object.values(providers).map((provider) => (
                    <>
                      <Button
                        asChild
                        key={provider.name}
                        onClick={() => signIn(provider.id)}
                        className="bg-[#00bf63] text-white hover:bg-[#00bf63]/90"
                      >
                        Get Started
                      </Button>
                    </>
                  ))}
              </>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div
          className={`md:hidden transition-all duration-300 ease-in-out ${
            mobileMenuOpen ? "max-h-48 opacity-100" : "max-h-0 opacity-0"
          } overflow-hidden`}
        >
          <div className="py-4 space-y-4">
            <Link
              href="#features"
              className="block text-sm font-medium hover:text-primary transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Explore
            </Link>
            <Link
              href="#features"
              className="block text-sm font-medium hover:text-primary transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Features
            </Link>
            <Link
              href=""
              className="block text-sm font-medium hover:text-primary transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Support
            </Link>
            <div className="flex items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-800">
              {isUserLoggedIn ? (
                <div className="flex items-center gap-4">
                  <Button
                    asChild
                    className="bg-[#00bf63] text-white hover:bg-[#00bf63]/90"
                  >
                    <Link href="#">Create post</Link>
                  </Button>
                  <Button
                    asChild
                    className="border hover:bg-[#00bf63] hover:text-white hover:border-none"
                  >
                    <Link href="#">Sign Out</Link>
                  </Button>
                  <Link
                    href="/profile"
                    className="text-sm font-medium hover:text-primary transition-colors"
                  >
                    <User className="h-5 w-5 text-gray-300" />
                    {/* <Image src="/profile.png" alt="Profile" width={30} height={30} /> */}
                  </Link>
                </div>
              ) : (
                <>
                  {providers &&
                    Object.values(providers).map((provider) => (
                      <>
                        <Button
                          asChild
                          key={provider.name}
                          onClick={() => signIn(provider.id)}
                          className="bg-[#00bf63] text-white hover:bg-[#00bf63]/90"
                        >
                          Get Started
                        </Button>
                        </>
                    ))}
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
