"use client";

import React from "react";
import { cn } from "@/lib/utils";

type TooltipProps = {
  content: string;
  /** A single focusable element (button, link). */
  children: React.ReactElement<{ "aria-describedby"?: string }>;
  side?: "top" | "bottom";
  className?: string;
};

const LONG_PRESS_MS = 450;

/**
 * Supplementary label for a control. Opens on hover and keyboard focus, and
 * on long-press for touch (there is no hover on phones). It never carries the
 * control's only name: icon buttons still need their own aria-label.
 */
export default function Tooltip({ content, children, side = "top", className }: TooltipProps) {
  const id = React.useId();
  const [open, setOpen] = React.useState(false);
  const pressTimer = React.useRef<number | null>(null);

  const clearPress = () => {
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };

  React.useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent | PointerEvent) => {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      setOpen(false);
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", close);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", close);
    };
  }, [open]);

  return (
    <span
      className="relative inline-flex"
      onPointerEnter={(event) => event.pointerType === "mouse" && setOpen(true)}
      onPointerLeave={(event) => event.pointerType === "mouse" && setOpen(false)}
      onPointerDown={(event) => {
        if (event.pointerType === "mouse") return;
        clearPress();
        pressTimer.current = window.setTimeout(() => setOpen(true), LONG_PRESS_MS);
      }}
      onPointerUp={clearPress}
      onPointerCancel={clearPress}
      onFocus={(event) => event.target.matches(":focus-visible") && setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {React.cloneElement(children, { "aria-describedby": id })}
      <span
        id={id}
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 z-tooltip w-max max-w-56 -translate-x-1/2 rounded-control border border-line bg-surface-raised px-2.5 py-1.5 text-micro font-medium text-foreground shadow-e2 transition-opacity duration-fast",
          side === "top" ? "bottom-full mb-2" : "top-full mt-2",
          open ? "opacity-100" : "invisible opacity-0",
          className,
        )}
      >
        {content}
      </span>
    </span>
  );
}
