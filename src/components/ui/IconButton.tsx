import React from "react";
import { cn } from "@/lib/utils";

/**
 * A single icon-only tap target, sized to Apple's 44pt / Material's 48dp
 * minimum recommended touch target. Use this instead of a one-off
 * `h-8 w-8` / `h-9 w-9` button so icon buttons stay a consistent size and
 * stay comfortable to tap on a phone.
 */
const IconButton = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<"button">>(
  ({ className, type = "button", children, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground/80 transition-colors hover:bg-surface-elevated hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
);
IconButton.displayName = "IconButton";

export default IconButton;
