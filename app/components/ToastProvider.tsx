"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type ToastVariant = "success" | "error" | "info";

type ToastItem = { id: string; message: string; variant: ToastVariant };

const TOAST_DURATION_MS = 4000;

type ToastContextValue = {
  showToast: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((prev) => [...prev, { id, message, variant }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_DURATION_MS);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="ayka-toast-host"
        style={{
          position: "fixed",
          top: 24,
          right: 24,
          zIndex: 99999,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          maxWidth: "min(400px, calc(100vw - 48px))",
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => {
          const accent =
            t.variant === "success"
              ? "#059669"
              : t.variant === "error"
                ? "#dc2626"
                : "#64748b";
          const bg =
            t.variant === "success"
              ? "#f0fdf4"
              : t.variant === "error"
                ? "#fef2f2"
                : "#f8fafc";
          const border = "1px solid #e2e8f0";
          const color =
            t.variant === "success"
              ? "#065f46"
              : t.variant === "error"
                ? "#991b1b"
                : "#334155";

          return (
            <div
              key={t.id}
              className="ayka-toast-item"
              style={{
                pointerEvents: "auto",
                padding: "12px 16px 12px 14px",
                borderRadius: 2,
                boxShadow: "0 4px 24px rgba(15, 23, 42, 0.08)",
                border,
                borderLeft: `4px solid ${accent}`,
                background: bg,
                color,
                fontSize: 14,
                lineHeight: 1.45,
                fontWeight: 500,
                animation: "aykaToastIn 0.28s ease-out both",
              }}
            >
              {t.message}
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes aykaToastIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast(): {
  showToast: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
} {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  const { showToast } = ctx;
  return useMemo(
    () => ({
      showToast,
      success: (message: string) => showToast(message, "success"),
      error: (message: string) => showToast(message, "error"),
      info: (message: string) => showToast(message, "info"),
    }),
    [showToast],
  );
}
