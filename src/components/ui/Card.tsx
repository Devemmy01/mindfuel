import React from "react";
import { cn } from "@/lib/utils";

type CardProps = React.ComponentPropsWithoutRef<"div"> & {
  /** `flat` blends into a list; `raised` sits above the page (popovers, callouts). */
  tone?: "default" | "flat" | "raised";
  padded?: boolean;
};

export function Card({ className, tone = "default", padded = true, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card border border-line",
        tone === "default" && "bg-surface",
        tone === "flat" && "bg-transparent",
        tone === "raised" && "bg-surface-raised shadow-e2",
        padded && "p-4",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  return <div className={cn("mb-3 flex items-start justify-between gap-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.ComponentPropsWithoutRef<"h3">) {
  return <h3 className={cn("text-h3 text-foreground", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.ComponentPropsWithoutRef<"p">) {
  return <p className={cn("text-caption text-muted-foreground", className)} {...props} />;
}
