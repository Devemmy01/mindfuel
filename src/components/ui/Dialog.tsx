"use client";

import React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import IconButton from "@/components/ui/IconButton";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Visually hide the title (it is still the dialog's accessible name). */
  hideTitle?: boolean;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  /**
   * `auto`: bottom sheet on phones, centered modal from `sm` up.
   * `sheet`: always a bottom sheet. `modal`: always centered.
   */
  presentation?: "auto" | "sheet" | "modal";
  size?: "sm" | "md" | "lg";
  /** Set false for flows that must not be dismissed by a stray tap. */
  dismissible?: boolean;
  className?: string;
};

/**
 * The single modal/sheet primitive: portal, focus trap, Escape, scroll lock,
 * focus restore, and a drag handle on sheets.
 */
export default function Dialog({
  open,
  onClose,
  title,
  hideTitle,
  description,
  children,
  footer,
  presentation = "auto",
  size = "md",
  dismissible = true,
  className,
}: DialogProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const descriptionId = React.useId();
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current;
      const first = panel?.querySelector<HTMLElement>("[data-autofocus]") || panel?.querySelector<HTMLElement>(FOCUSABLE);
      (first || panel)?.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dismissible) {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [open, dismissible, onClose]);

  if (!mounted) return null;

  const sheet = presentation === "sheet";
  const auto = presentation === "auto";

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div
          className={cn(
            "fixed inset-0 z-modal flex justify-center",
            sheet ? "items-end" : auto ? "items-end sm:items-center sm:p-4" : "items-center p-4",
          )}
        >
          <motion.div
            className="absolute inset-0 bg-black/55"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.18 }}
            onClick={dismissible ? onClose : undefined}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            tabIndex={-1}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
            transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.23, 1, 0.32, 1] }}
            className={cn(
              "relative flex max-h-[min(90dvh,100%)] w-full flex-col overflow-hidden border border-line bg-surface-raised text-foreground shadow-e3 outline-none",
              sheet || auto
                ? "rounded-t-sheet pb-[env(safe-area-inset-bottom)]"
                : "rounded-sheet",
              auto && "sm:rounded-sheet sm:pb-0",
              !sheet && size === "sm" && "sm:max-w-sm",
              !sheet && size === "md" && "sm:max-w-md",
              !sheet && size === "lg" && "sm:max-w-xl",
              className,
            )}
          >
            {sheet || auto ? (
              <span aria-hidden className={cn("mx-auto mt-2 h-1 w-10 rounded-full bg-line-strong", auto && "sm:hidden")} />
            ) : null}
            <div className="flex items-start gap-3 px-5 pb-2 pt-4">
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className={cn("text-h3", hideTitle && "sr-only")}>{title}</h2>
                {description ? (
                  <p id={descriptionId} className="mt-1 text-body-sm text-muted-foreground">{description}</p>
                ) : null}
              </div>
              {dismissible ? (
                <IconButton aria-label="Close" size="sm" onClick={onClose} className="-mr-1.5 -mt-1">
                  <X className="size-5" />
                </IconButton>
              ) : null}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
            {footer ? (
              <div className="flex flex-col-reverse gap-2 border-t border-line px-5 py-3 sm:flex-row sm:justify-end">{footer}</div>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
