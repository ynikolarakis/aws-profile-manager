import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

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

const icons = {
  ok: CheckCircle2,
  err: AlertCircle,
  info: Info,
};

const borderColors = {
  ok: "border-l-[var(--green)]",
  err: "border-l-[var(--red)]",
  info: "border-l-[var(--ac)]",
};

const iconColors = {
  ok: "text-[var(--green)]",
  err: "text-[var(--red)]",
  info: "text-[var(--ac)]",
};

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
    return () => { addToastFn = null; };
  }, [addToast]);

  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = icons[toast.type];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "flex items-center gap-2.5 bg-[var(--bg-2)] border border-[var(--border-h)] border-l-[3px] rounded-md px-3.5 py-2.5 text-[12px] text-[var(--t1)] shadow-[0_4px_20px_rgba(0,0,0,.2)] max-w-[300px]",
                borderColors[toast.type]
              )}
            >
              <Icon className={cn("w-4 h-4 shrink-0", iconColors[toast.type])} />
              {toast.text}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
