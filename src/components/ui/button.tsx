import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import Spinner from "@/components/ui/Spinner"

const buttonVariants = cva(
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-semibold transition-[background-color,color,border-color,transform] duration-fast ease-out-expo active:scale-[0.98] motion-reduce:active:scale-100 disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-progress [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[1.125rem] touch-manipulation",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
        secondary: "border border-line bg-surface text-foreground hover:bg-surface-elevated hover:border-line-strong",
        ghost: "text-foreground hover:bg-accent",
        danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        link: "h-auto px-0 text-primary-text underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        sm: "h-9 rounded-control px-3 text-caption",
        md: "h-11 rounded-card px-4 text-body-sm",
        lg: "h-12 rounded-card px-5 text-body",
      },
      block: {
        true: "w-full",
      },
    },
    compoundVariants: [{ variant: "link", className: "h-auto px-0" }],
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** Shows a spinner, sets aria-busy and blocks repeat submits. */
    loading?: boolean
  }

/**
 * The one button. Use a single `primary` per screen region; everything else
 * is `secondary` or `ghost` so the main action is never ambiguous.
 */
function Button({
  className,
  variant,
  size,
  block,
  asChild = false,
  loading = false,
  disabled,
  children,
  type,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, block, className }))}
      aria-busy={loading || undefined}
      disabled={asChild ? undefined : disabled || loading}
      type={asChild ? undefined : type ?? "button"}
      {...props}
    >
      {asChild ? children : (
        <>
          {loading ? <Spinner /> : null}
          {children}
        </>
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
export type { ButtonProps }
