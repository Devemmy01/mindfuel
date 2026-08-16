import React from "react";
import { cn } from "@/lib/utils";

/**
 * Standard loading placeholder. Prefer this over a spinner for anything
 * that's replacing list/card content once it loads — it preserves layout
 * instead of a jump-cut, which reads as faster on mobile. Reserve spinners
 * for action-pending states (a button mid-submit, a page transition).
 */
export default function Skeleton({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  return <div className={cn("skeleton", className)} {...props} />;
}
