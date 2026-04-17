"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";

interface SplashScreenProps {
  isLoading: boolean;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ isLoading }) => {
  const [shouldRender, setShouldRender] = useState(isLoading);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setIsFadingOut(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 800); // Duration of fade-out animation
      return () => clearTimeout(timer);
    } else {
      setShouldRender(true);
      setIsFadingOut(false);
    }
  }, [isLoading]);

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#111827] transition-all duration-700 ease-in-out ${
        isFadingOut
          ? "opacity-0 scale-105 pointer-events-none"
          : "opacity-100 scale-100"
      }`}
    >
      <div className="flex-1 flex items-center justify-center">
        <Image
          src="/splash-logo.png"
          alt="MindFuel Logo"
          width={100}
          height={100}
          className="w-24 h-24 md:w-32 md:h-32 object-contain"
          priority
        />
      </div>

      <div className="pb-12 flex flex-col items-center gap-1">
        <span className="text-[12px] text-muted-foreground/40 font-medium tracking-tight">from</span>
        <span className="text-[17px] font-bold text-white tracking-widest uppercase">Lumyn</span>
      </div>
    </div>
  );
};

export default SplashScreen;
