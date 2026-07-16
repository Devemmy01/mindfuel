"use client";

import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
  message: React.ReactNode;
  type: ToastType;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-brand-green" />,
    error: <AlertCircle className="w-4 h-4 text-rose-500" />,
    info: <Info className="w-4 h-4 text-blue-400" />,
    warning: <AlertCircle className="w-4 h-4 text-amber-400" />,
  };

  const bgStyles = "popover-solid border border-white/10";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      role={type === "error" ? "alert" : "status"}
      className={`fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[200] flex items-start gap-3 rounded-2xl px-3.5 py-3 shadow-2xl ${bgStyles} sm:inset-x-auto sm:bottom-6 sm:left-1/2 sm:w-max sm:min-w-[20rem] sm:max-w-[min(32rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:px-4`}
    >
      <div className="mt-0.5 flex-shrink-0">{icons[type]}</div>
      <div className="min-w-0 flex-1 break-words text-[13px] font-semibold leading-5 text-white/90 sm:text-[14px]">
        {message}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="-mr-1 -mt-0.5 ml-1 flex-shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

export default Toast;
