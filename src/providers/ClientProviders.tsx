"use client";

import React from "react";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import SignInModal from "@/components/SignInModal";

function SignInModalWrapper() {
  const { showSignInModal, closeSignInModal } = useAuth();
  return <SignInModal isOpen={showSignInModal} onClose={closeSignInModal} />;
}

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        {children}
        <SignInModalWrapper />
      </ToastProvider>
    </AuthProvider>
  );
}
