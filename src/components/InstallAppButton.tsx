"use client";

import React, { useEffect, useState } from "react";
import { Check, Download } from "lucide-react";

function installed() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export default function InstallAppButton({
  className = "inline-flex items-center justify-center gap-2 rounded-full bg-brand-green px-6 py-3.5 text-sm font-black text-white transition hover:bg-[#00a855]",
  installedLabel = "MindFuel is installed",
}: {
  className?: string;
  installedLabel?: string;
}) {
  const [isInstalled, setIsInstalled] = useState(false);
  useEffect(() => {
    setIsInstalled(installed());
    const onInstalled = () => setIsInstalled(true);
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  return (
    <button
      type="button"
      disabled={isInstalled}
      onClick={() => window.dispatchEvent(new Event("mindfuel:request-install"))}
      className={`${className} disabled:cursor-default disabled:opacity-70`}
    >
      {isInstalled ? <Check className="h-4 w-4" /> : <Download className="h-4 w-4" />}
      {isInstalled ? installedLabel : "Install MindFuel"}
    </button>
  );
}
