"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type TabItem<T extends string> = {
  value: T;
  label: string;
  /** One line explaining what this tab contains, shown under the active tab. */
  description?: string;
};

type TabsProps<T extends string> = {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the tab list, e.g. "Feed". */
  label: string;
  showDescription?: boolean;
  className?: string;
  idPrefix?: string;
};

/**
 * WAI-ARIA tabs with roving focus (arrow keys, Home/End). Panels are rendered
 * by the caller with `tabPanelProps(...)` so layouts stay flexible.
 */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
  showDescription = false,
  className,
  idPrefix = "tabs",
}: TabsProps<T>) {
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const activeIndex = Math.max(0, items.findIndex((item) => item.value === value));
  const active = items[activeIndex];

  const focusTab = (index: number) => {
    const next = (index + items.length) % items.length;
    refs.current[next]?.focus();
    onChange(items[next].value);
  };

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={label}
        className="flex border-b border-line"
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") focusTab(activeIndex + 1);
          else if (event.key === "ArrowLeft") focusTab(activeIndex - 1);
          else if (event.key === "Home") focusTab(0);
          else if (event.key === "End") focusTab(items.length - 1);
          else return;
          event.preventDefault();
        }}
      >
        {items.map((item, index) => {
          const selected = item.value === value;
          return (
            <button
              key={item.value}
              ref={(node) => {
                refs.current[index] = node;
              }}
              id={`${idPrefix}-tab-${item.value}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`${idPrefix}-panel-${item.value}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(item.value)}
              className={cn(
                "relative flex h-12 flex-1 items-center justify-center px-4 text-body-sm font-semibold transition-colors duration-fast touch-manipulation",
                selected ? "text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              {item.label}
              <span
                aria-hidden
                className={cn(
                  "absolute inset-x-1/4 bottom-0 h-0.5 rounded-full bg-primary transition-opacity duration-fast",
                  selected ? "opacity-100" : "opacity-0",
                )}
              />
            </button>
          );
        })}
      </div>
      {showDescription && active?.description ? (
        <p className="px-4 py-2.5 text-caption text-muted-foreground" aria-live="polite">
          {active.description}
        </p>
      ) : null}
    </div>
  );
}

export function tabPanelProps<T extends string>(value: T, idPrefix = "tabs") {
  return {
    id: `${idPrefix}-panel-${value}`,
    role: "tabpanel" as const,
    "aria-labelledby": `${idPrefix}-tab-${value}`,
    tabIndex: 0,
  };
}
