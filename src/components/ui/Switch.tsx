"use client";

import React from "react";
import { cn } from "@/lib/utils";

type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Accessible name when there is no visible <label>. */
  label?: string;
  labelledBy?: string;
  disabled?: boolean;
  className?: string;
};

/** On/off control. The 44px hit area wraps a compact visual track. */
export default function Switch({ checked, onChange, label, labelledBy, disabled, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={Boolean(checked)}
      aria-label={label}
      aria-labelledby={labelledBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn("group inline-flex h-11 w-14 shrink-0 items-center justify-center touch-manipulation disabled:opacity-50", className)}
    >
      <span
        className={cn(
          "flex h-6 w-10 items-center rounded-full border p-0.5 transition-colors duration-fast",
          checked ? "justify-end border-primary bg-primary" : "justify-start border-line-strong bg-surface-elevated",
        )}
      >
        <span
          className={cn(
            "size-[1.125rem] rounded-full shadow-e1",
            checked ? "bg-primary-foreground" : "bg-foreground/80",
          )}
        />
      </span>
    </button>
  );
}
