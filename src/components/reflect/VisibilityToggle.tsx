"use client";

import React from "react";
import { Lock, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PostVisibility } from "@/lib/post-visibility";

const OPTIONS: Array<{ value: PostVisibility; label: string; hint: string; icon: typeof Lock }> = [
  { value: "private", label: "Just me", hint: "Only you can see it", icon: Lock },
  { value: "public", label: "Community", hint: "Anyone on MindFuel can read and reply", icon: Users },
];

/**
 * Who will see this reflection. "Just me" is the default so personal writing
 * is never published by accident.
 */
export default function VisibilityToggle({
  value,
  onChange,
  disabled,
  className,
}: {
  value: PostVisibility;
  onChange: (value: PostVisibility) => void;
  disabled?: boolean;
  className?: string;
}) {
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const hintId = React.useId();
  const active = OPTIONS.find((option) => option.value === value) ?? OPTIONS[0];

  const move = (index: number) => {
    const next = (index + OPTIONS.length) % OPTIONS.length;
    onChange(OPTIONS[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div
        role="radiogroup"
        aria-label="Who can see this reflection"
        aria-describedby={hintId}
        className="inline-flex rounded-full border border-line bg-surface-elevated p-0.5"
      >
        {OPTIONS.map((option, index) => {
          const selected = option.value === value;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              ref={(node) => {
                refs.current[index] = node;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                  event.preventDefault();
                  move(index + 1);
                } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                  event.preventDefault();
                  move(index - 1);
                }
              }}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-caption font-semibold transition-colors duration-fast touch-manipulation disabled:opacity-50",
                selected ? "bg-surface-raised text-foreground shadow-e1 ring-1 ring-line" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {option.label}
            </button>
          );
        })}
      </div>
      <p id={hintId} className="px-1 text-micro text-muted-foreground" aria-live="polite">
        {active.hint}
      </p>
    </div>
  );
}
