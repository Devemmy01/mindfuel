import React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  /** The next useful thing to do. An empty state always offers one. */
  action?: React.ReactNode;
  className?: string;
};

export default function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      {Icon ? (
        <span className="mb-4 flex size-12 items-center justify-center rounded-full border border-line bg-surface-elevated text-muted-foreground">
          <Icon className="size-5" aria-hidden />
        </span>
      ) : null}
      <h2 className="text-h3 text-foreground">{title}</h2>
      {description ? <p className="mt-1.5 max-w-sm text-body-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}
