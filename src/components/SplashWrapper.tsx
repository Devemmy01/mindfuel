"use client";

import React from "react";
import { useAuth } from "@/providers/AuthProvider";
import SplashScreen from "./SplashScreen";

export default function SplashWrapper({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  return (
    <>
      <SplashScreen isLoading={loading} />
      {children}
    </>
  );
}
