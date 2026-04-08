"use client";

import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
  message: string;
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

  const bgStyles = "bg-popover/80 backdrop-blur-md border border-border shadow-2xl";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-5 py-3 rounded-2xl ${bgStyles} min-w-[280px] max-w-[400px]`}
    >
      <div className="flex-shrink-0">{icons[type]}</div>
      <p className="flex-1 text-[13.5px] font-medium tracking-tight text-foreground/90 leading-tight">
        {message}
      </p>
      <button
        onClick={onClose}
        className="p-1 -mr-1.5 rounded-full hover:bg-secondary/60 text-muted-foreground transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
};

export default Toast;
