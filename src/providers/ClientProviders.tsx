"use client";

import React from "react";
import { LazyMotion } from "framer-motion";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import { PresenceProvider } from "@/providers/PresenceProvider";
import SignInModal from "@/components/SignInModal";
import { installAuthedFetch } from "@/lib/authed-fetch";

installAuthedFetch();

const loadMotionFeatures = () => import("@/lib/motion-features").then((module) => module.default);

function SignInModalWrapper() {
  const { showSignInModal, closeSignInModal } = useAuth();
  return <SignInModal isOpen={showSignInModal} onClose={closeSignInModal} />;
}

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={loadMotionFeatures}>
    <AuthProvider>
      <ToastProvider>
        <PresenceProvider>
          {children}
          <SignInModalWrapper />
        </PresenceProvider>
      </ToastProvider>
    </AuthProvider>
    </LazyMotion>
  );
}
