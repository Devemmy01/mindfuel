"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
  message: React.ReactNode;
  type: ToastType;
  onClose: () => void;
  /** Optional inline action, e.g. Undo. */
  action?: { label: string; onClick: () => void };
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="size-[1.125rem] text-primary-text" aria-hidden />,
  error: <AlertCircle className="size-[1.125rem] text-destructive" aria-hidden />,
  info: <Info className="size-[1.125rem] text-muted-foreground" aria-hidden />,
  warning: <AlertCircle className="size-[1.125rem] text-warning" aria-hidden />,
};

const Toast: React.FC<ToastProps> = ({ message, type, onClose, action }) => {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.23, 1, 0.32, 1] }}
      role={type === "error" ? "alert" : "status"}
      className={cn(
        "fixed inset-x-3 bottom-[calc(var(--toast-offset,1rem)+env(safe-area-inset-bottom))] z-toast flex items-center gap-3 rounded-card border border-line bg-surface-raised px-3.5 py-3 text-foreground shadow-e3",
        "sm:inset-x-auto sm:bottom-6 sm:left-1/2 sm:w-max sm:min-w-[20rem] sm:max-w-[min(32rem,calc(100vw-2rem))] sm:-translate-x-1/2",
      )}
    >
      <span className="shrink-0">{ICONS[type]}</span>
      <div className="min-w-0 flex-1 break-words text-body-sm font-medium">{message}</div>
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className="shrink-0 rounded-control px-2 py-1 text-body-sm font-semibold text-primary-text hover:bg-accent"
        >
          {action.label}
        </button>
      ) : null}
      <button
        type="button"
        onClick={onClose}
        className="-mr-1 flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="size-4" aria-hidden />
      </button>
    </motion.div>
  );
};

export default Toast;
