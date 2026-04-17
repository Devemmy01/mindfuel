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
        isFadingOut ? "opacity-0 scale-105 pointer-events-none" : "opacity-100 scale-100"
      }`}
    >
      {/* Premium Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-green/10 blur-[120px] rounded-full animate-pulse" />
      </div>

      <div className="relative flex flex-col items-center">
        {/* Animated Logo Container */}
        <div className="relative w-32 h-32 md:w-40 md:h-40 mb-8 animate-float">
           {/* Outer glow */}
           <div className="absolute inset-0 bg-brand-green/20 blur-2xl rounded-full animate-pulse" />
           
           <Image
            src="/logo.png"
            alt="MindFuel Logo"
            width={160}
            height={160}
            className="relative z-10 w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(0,191,99,0.5)]"
            priority
          />
        </div>

        {/* Loading Text */}
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white/90">
            MindFuel
          </h1>
          <div className="flex items-center gap-1.5">
             <span className="w-1.5 h-1.5 bg-brand-green rounded-full animate-bounce [animation-delay:-0.3s]" />
             <span className="w-1.5 h-1.5 bg-brand-green rounded-full animate-bounce [animation-delay:-0.15s]" />
             <span className="w-1.5 h-1.5 bg-brand-green rounded-full animate-bounce" />
          </div>
          <p className="mt-6 text-[11px] uppercase tracking-[0.2em] font-bold text-muted-foreground/60 animate-pulse">
            Fueling your mind...
          </p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
