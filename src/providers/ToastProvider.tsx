"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import Toast from "@/components/ui/Toast";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastContextType {
  showToast: (message: React.ReactNode, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<{ message: React.ReactNode; type: ToastType; id: number } | null>(null);

  const showToast = useCallback((message: React.ReactNode, type: ToastType = "info", duration: number = 3000) => {
    const id = Date.now();
    setToast({ message, type, id });
    
    // Auto-hide after specified duration
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <AnimatePresence>
        {toast && (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
