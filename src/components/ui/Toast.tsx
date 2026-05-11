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

  const bgStyles = "bg-popover/95 backdrop-blur-xl border border-white/10 shadow-2xl";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-4 py-2.5 rounded-full ${bgStyles} w-fit max-w-[90vw] md:max-w-[400px]`}
    >
      <div className="flex-shrink-0">{icons[type]}</div>
      <div className="text-[14px] font-semibold text-foreground/90 whitespace-nowrap px-1">
        {message}
      </div>
      <button
        onClick={onClose}
        className="p-1 -mr-1.5 rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors ml-1"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

export default Toast;
