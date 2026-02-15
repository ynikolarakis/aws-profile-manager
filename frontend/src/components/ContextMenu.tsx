import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface MenuItem {
  label?: string;
  action?: () => void;
  danger?: boolean;
  separator?: true;
}

interface Props {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);

  // Bounds check
  const menuW = 180;
  const menuH = items.length * 30;
  const adjustedX = x + menuW > window.innerWidth ? x - menuW : x;
  const adjustedY = y + menuH > window.innerHeight ? y - menuH : y;

  return (
    <AnimatePresence>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.1 }}
        style={{
          position: "fixed",
          top: adjustedY,
          left: adjustedX,
          width: menuW,
          background: "var(--bg-2)",
          border: "1px solid var(--border-h)",
          borderRadius: "var(--r-lg)",
          padding: "4px",
          zIndex: 1000,
          boxShadow: "0 8px 30px rgba(0,0,0,.3)",
        }}
      >
        {items.map((item, i) => {
          if (item.separator) {
            return (
              <div
                key={`sep-${i}`}
                style={{
                  height: 1,
                  background: "var(--border)",
                  margin: "4px 0",
                }}
              />
            );
          }
          return (
            <button
              key={item.label}
              onClick={() => {
                item.action?.();
                onClose();
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "6px 10px",
                fontSize: 12,
                fontWeight: 500,
                color: item.danger ? "var(--red)" : "var(--t1)",
                borderRadius: "var(--r)",
                transition: "background .08s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = item.danger
                  ? "var(--red-dim)"
                  : "rgba(255,255,255,.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "none";
              }}
            >
              {item.label}
            </button>
          );
        })}
      </motion.div>
    </AnimatePresence>
  );
}
