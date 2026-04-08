"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Quote, RefreshCw } from "lucide-react";

const quotes = [
  { text: "Be present in all things and thankful for all things.", author: "Maya Angelou" },
  { text: "The soul usually knows what to do to heal itself. The challenge is to silence the mind.", author: "Caroline Myss" },
  { text: "Quiet the mind, and the soul will speak.", author: "Ma Jaya Sati Bhagavati" },
  { text: "Almost everything will work again if you unplug it for a few minutes, including you.", author: "Anne Lamott" },
  { text: "The goal of meditation isn't to control your thoughts, it's to stop letting them control you.", author: "Anonymous" },
  { text: "In the middle of a world that has always been a bit mad, the habit of liberty of mind is the only true possession.", author: "A.S. Byatt" },
];

const DailyFuel: React.FC = () => {
  const [quote, setQuote] = useState(quotes[0]);
  const [isRotating, setIsRotating] = useState(false);

  useEffect(() => {
    // Pick a random quote on mount
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    setQuote(randomQuote);
  }, []);

  const handleRefresh = () => {
    setIsRotating(true);
    setTimeout(() => {
      let nextQuote;
      do {
        nextQuote = quotes[Math.floor(Math.random() * quotes.length)];
      } while (nextQuote.text === quote.text);
      setQuote(nextQuote);
      setIsRotating(false);
    }, 600);
  };

  return (
    <div className="bg-gradient-to-br from-[#00bf63]/20 to-[#00bf63]/5 border border-brand-green/20 rounded-[2.5rem] p-7 pt-8 relative overflow-hidden mb-6 group shadow-sm transition-all duration-500 hover:shadow-brand-md h-auto">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-brand-green/10 rounded-full -translate-y-20 translate-x-20 blur-3xl pointer-events-none group-hover:bg-brand-green/15 transition-all duration-700" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-green/5 rounded-full translate-y-16 -translate-x-16 blur-2xl pointer-events-none" />
      
      <div className="flex items-center justify-between mb-5 relative z-10">
        <div className="inline-flex items-center gap-2.5 bg-brand-green/20 px-3.5 py-1.5 rounded-full">
          <Sparkles className="w-3 h-3 text-brand-green fill-brand-green/20" />
          <p className="text-[10px] font-black text-brand-green tracking-[0.18em] uppercase">Daily Fuel</p>
        </div>
        <button 
          onClick={handleRefresh}
          className={`p-2 rounded-full hover:bg-brand-green/10 text-brand-green/60 hover:text-brand-green transition-all ${isRotating ? "animate-spin" : ""}`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <motion.div
        key={quote.text}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        className="relative z-10"
      >
        <Quote className="absolute -top-2 -left-2 w-8 h-8 text-brand-green/10 pointer-events-none" />
        <p className="text-[19px] font-bold leading-[1.4] text-foreground mb-5 tracking-tight italic relative">
          &quot;{quote.text}&quot;
        </p>
        <div className="flex items-center gap-3 opacity-90">
          <div className="w-5 h-[1.5px] bg-brand-green/40" />
          <p className="text-[13px] text-muted-foreground font-bold tracking-tight">
            {quote.author}
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default DailyFuel;
