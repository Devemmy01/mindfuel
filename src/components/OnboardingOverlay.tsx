"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const ONBOARDING_KEY = "mindfuel_onboarding_seen";

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const steps: OnboardingStep[] = [
  {
    title: "Share Your Thoughts",
    description: "Post meaningful reflections, quotes, curations, and ideas that fuel your mind.",
    icon: <Sparkles className="w-6 h-6" />,
  },
  {
    title: "Connect with Thinkers",
    description: "Like and save reflections that resonate with you.",
    icon: <Sparkles className="w-6 h-6" />,
  },
  {
    title: "Fuel Your Mind Daily",
    description: "Get daily inspiration. A calm space free from noise and distractions.",
    icon: <Sparkles className="w-6 h-6" />,
  },
];

export default function OnboardingOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem(ONBOARDING_KEY);
    if (!seen) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setIsVisible(false);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleDismiss();
    }
  };

  const handleSkip = () => {
    handleDismiss();
  };

  if (!isVisible) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
      >
        
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="w-full max-w-md border border-border rounded-3xl p-8 shadow-2xl"
        >
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-secondary transition-colors"
            aria-label="Skip onboarding"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>

          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-brand-green/10 rounded-2xl flex items-center justify-center text-brand-green">
              <Image src="/splash-logo.png" alt="Logo" width={50} height={50} />
            </div>
          </div>

          <div className="flex gap-2 justify-center mb-6">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentStep
                    ? "w-8 bg-brand-green"
                    : "w-2 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>

          <h2 className="text-2xl font-bold text-center mb-3">{step.title}</h2>
          <p className="text-muted-foreground text-center mb-8 leading-relaxed">
            {step.description}
          </p>

          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              className="flex-1 py-3 rounded-full font-semibold text-muted-foreground hover:bg-secondary transition-colors"
            >
              Skip
            </button>
            <button
              onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full font-semibold bg-brand-green text-white hover:bg-brand-green/90 transition-colors"
            >
              {isLastStep ? (
                <>
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                "Next"
              )}
            </button>
          </div>

          {isLastStep && (
            <Link
              href="/create"
              onClick={handleDismiss}
              className="block text-center mt-4 text-sm text-brand-green hover:underline font-medium"
            >
              Or share your first thought now →
            </Link>
          )}
        </motion.div>
      </motion.div>
   
  </AnimatePresence>
);
}