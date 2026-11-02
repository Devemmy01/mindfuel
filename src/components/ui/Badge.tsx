import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full font-semibold tabular-nums",
  {
    variants: {
      tone: {
        neutral: "bg-surface-elevated text-muted-foreground ring-1 ring-inset ring-line",
        accent: "bg-primary/12 text-primary-text ring-1 ring-inset ring-primary/25",
        danger: "bg-destructive/12 text-destructive ring-1 ring-inset ring-destructive/25",
        // Unread counts: solid so they read at a glance on any surface.
        count: "min-w-5 justify-center bg-primary px-1.5 text-primary-foreground",
      },
      size: {
        sm: "h-5 px-2 text-micro",
        md: "h-6 px-2.5 text-caption",
      },
    },
    defaultVariants: { tone: "neutral", size: "sm" },
  },
);

type BadgeProps = React.ComponentPropsWithoutRef<"span"> & VariantProps<typeof badgeVariants>;

export function Badge({ className, tone, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />;
}

type ChipProps = React.ComponentPropsWithoutRef<"button"> & { selected?: boolean };

/** A toggleable filter/choice. Exposes its state with aria-pressed. */
export function Chip({ className, selected = false, type = "button", ...props }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        "inline-flex h-9 select-none items-center gap-1.5 rounded-full border px-3.5 text-caption font-semibold transition-colors duration-fast touch-manipulation active:scale-[0.98]",
        selected
          ? "border-primary/40 bg-primary/12 text-primary-text"
          : "border-line bg-surface text-muted-foreground hover:border-line-strong hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}
