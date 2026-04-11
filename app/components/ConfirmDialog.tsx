"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export type ConfirmOptions = {
  /** Short heading; omit for message-only dialogs */
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red/destructive primary button */
  variant?: "danger" | "default";
};

type Pending = { resolve: (value: boolean) => void };

const ConfirmContext = createContext<
  ((options: ConfirmOptions) => Promise<boolean>) | null
>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const pendingRef = useRef<Pending | null>(null);

  const requestConfirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      pendingRef.current = { resolve };
      setOptions(opts);
      setOpen(true);
    });
  }, []);

  const finish = useCallback((value: boolean) => {
    const p = pendingRef.current;
    pendingRef.current = null;
    setOpen(false);
    setOptions(null);
    p?.resolve(value);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        finish(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, finish]);

  const variant = options?.variant ?? "default";
  const confirmLabel = options?.confirmLabel ?? "OK";
  const cancelLabel = options?.cancelLabel ?? "Cancel";

  return (
    <ConfirmContext.Provider value={requestConfirm}>
      {children}
      {open && options && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={
            options.title ? "ayka-confirm-title" : undefined
          }
          aria-label={options.title ? undefined : "Confirm action"}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99990,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            background: "rgba(15, 23, 42, 0.45)",
          }}
          onClick={() => finish(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              borderRadius: 2,
              background: "#fff",
              border: "1px solid #e2e8f0",
              boxShadow:
                "0 25px 50px -12px rgba(15, 23, 42, 0.2), 0 0 0 1px rgba(15, 23, 42, 0.04)",
              padding: "24px 24px 20px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {options.title ? (
              <h2
                id="ayka-confirm-title"
                style={{
                  margin: "0 0 10px",
                  fontSize: 17,
                  fontWeight: 700,
                  color: "#0f172a",
                  lineHeight: 1.3,
                }}
              >
                {options.title}
              </h2>
            ) : null}
            <p
              style={{
                margin: options.title ? "0 0 22px" : "0 0 22px",
                fontSize: 14,
                lineHeight: 1.55,
                color: "#475569",
              }}
            >
              {options.message}
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  borderRadius: 2,
                  padding: "10px 18px",
                  fontSize: 14,
                  fontWeight: 600,
                }}
                onClick={() => finish(false)}
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{
                  borderRadius: 2,
                  padding: "10px 18px",
                  fontSize: 14,
                  fontWeight: 600,
                  ...(variant === "danger"
                    ? {
                        background: "#dc2626",
                        borderColor: "#dc2626",
                        color: "#fff",
                      }
                    : {}),
                }}
                onClick={() => finish(true)}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): (options: ConfirmOptions) => Promise<boolean> {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }
  return ctx;
}
