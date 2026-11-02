"use client";

import { useEffect } from "react";

/**
 * Publishes the on-screen keyboard's height as --keyboard-inset (0 when
 * closed) using the visualViewport API. Fixed bottom bars (composer toolbar,
 * chat input) add it to their bottom padding so iOS never hides them.
 */
export default function KeyboardInset() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const root = document.documentElement;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
        // Ignore small differences from browser chrome showing and hiding.
        root.style.setProperty("--keyboard-inset", `${inset > 80 ? Math.round(inset) : 0}px`);
      });
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);
  return null;
}
