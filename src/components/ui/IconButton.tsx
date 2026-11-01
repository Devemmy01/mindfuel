import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const iconButtonVariants = cva(
  "inline-flex shrink-0 select-none items-center justify-center rounded-full transition-[background-color,color,transform] duration-fast active:scale-95 motion-reduce:active:scale-100 disabled:pointer-events-none disabled:opacity-40 touch-manipulation",
  {
    variants: {
      variant: {
        ghost: "text-foreground/80 hover:bg-accent hover:text-foreground",
        secondary: "border border-line bg-surface text-foreground hover:bg-surface-elevated",
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
      },
      size: {
        // 44px is the minimum comfortable touch target; `sm` is for dense
        // desktop toolbars only and keeps a 44px hit area via padding.
        md: "size-11",
        sm: "size-9 before:absolute before:-inset-1 relative",
      },
    },
    defaultVariants: { variant: "ghost", size: "md" },
  },
);

type IconButtonProps = Omit<React.ComponentPropsWithoutRef<"button">, "aria-label"> &
  VariantProps<typeof iconButtonVariants> & {
    /** Required: icon-only controls must have an accessible name. */
    "aria-label": string;
  };

/** An icon-only control with a guaranteed accessible name and touch target. */
const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, type = "button", children, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(iconButtonVariants({ variant, size }), className)}
      {...props}
    >
      {children}
    </button>
  ),
);
IconButton.displayName = "IconButton";

export default IconButton;
export { iconButtonVariants };
