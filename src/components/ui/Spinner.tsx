import { cn } from "@/lib/utils";

/** Inline progress indicator for pending actions. Lists use Skeleton instead. */
export default function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        "inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]",
        className,
      )}
    />
  );
}
