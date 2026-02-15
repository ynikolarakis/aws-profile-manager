import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ToastMessage {
  id: number;
  text: string;
  type: "ok" | "err" | "info";
}

let addToastFn: ((text: string, type?: "ok" | "err" | "info") => void) | null = null;

export function showToast(text: string, type: "ok" | "err" | "info" = "info") {
  addToastFn?.(text, type);
}

let idCounter = 0;

export function Toast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((text: string, type: "ok" | "err" | "info" = "info") => {
    const id = ++idCounter;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    return () => {
      addToastFn = null;
    };
  }, [addToast]);

  const colors = {
    ok: "var(--green)",
    err: "var(--red)",
    info: "var(--ac)",
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              background: "var(--bg-2)",
              border: "1px solid var(--border-h)",
              borderLeft: `3px solid ${colors[toast.type]}`,
              borderRadius: "var(--r)",
              padding: "8px 14px",
              fontSize: 12,
              color: "var(--t1)",
              boxShadow: "0 4px 20px rgba(0,0,0,.2)",
              maxWidth: 300,
            }}
          >
            {toast.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
