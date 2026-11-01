"use client";

import React from "react";
import { cn } from "@/lib/utils";

// 16px text on every field: iOS Safari zooms the page when a focused input's
// font size is smaller than that.
const fieldBase =
  "w-full rounded-control border border-line bg-surface-elevated px-3 text-body text-foreground placeholder:text-subtle-foreground transition-[border-color,box-shadow] duration-fast hover:border-line-strong focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<"input">>(
  ({ className, type = "text", ...props }, ref) => (
    <input ref={ref} type={type} className={cn(fieldBase, "h-11", className)} {...props} />
  ),
);
Input.displayName = "Input";

type TextareaProps = React.ComponentPropsWithoutRef<"textarea"> & {
  /** Grow with content up to `maxRows`, instead of showing a scrollbar. */
  autoResize?: boolean;
  maxRows?: number;
};

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, autoResize = false, maxRows = 12, onInput, ...props }, forwardedRef) => {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

    const resize = React.useCallback(() => {
      const element = innerRef.current;
      if (!autoResize || !element) return;
      const lineHeight = parseFloat(getComputedStyle(element).lineHeight) || 24;
      element.style.height = "auto";
      element.style.height = `${Math.min(element.scrollHeight, lineHeight * maxRows + 24)}px`;
    }, [autoResize, maxRows]);

    React.useLayoutEffect(resize, [resize, props.value]);

    return (
      <textarea
        ref={(node) => {
          innerRef.current = node;
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef) forwardedRef.current = node;
        }}
        className={cn(fieldBase, "min-h-24 resize-none py-2.5 leading-relaxed", className)}
        onInput={(event) => {
          resize();
          onInput?.(event);
        }}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

type FieldProps = {
  label: string;
  /** Visually hide the label while keeping it for assistive technology. */
  hideLabel?: boolean;
  hint?: React.ReactNode;
  error?: string;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => React.ReactNode;
  className?: string;
};

/** Label, control, hint and error wired together with the right ARIA ids. */
export function Field({ label, hideLabel, hint, error, children, className }: FieldProps) {
  const id = React.useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className={cn("text-caption font-medium text-foreground", hideLabel && "sr-only")}>
        {label}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint ? <p id={hintId} className="text-caption text-muted-foreground">{hint}</p> : null}
      {error ? <p id={errorId} role="alert" className="text-caption text-destructive">{error}</p> : null}
    </div>
  );
}
