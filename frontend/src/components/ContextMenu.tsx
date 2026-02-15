import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, LogIn, DollarSign, Pencil, Trash2, Radar } from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  "eye": Eye,
  "log-in": LogIn,
  "dollar-sign": DollarSign,
  "pencil": Pencil,
  "trash-2": Trash2,
  "radar": Radar,
};

interface MenuItem {
  label?: string;
  icon?: string;
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
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handle);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const menuW = 192;
  const menuH = items.length * 32;
  const adjustedX = x + menuW > window.innerWidth ? x - menuW : x;
  const adjustedY = y + menuH > window.innerHeight ? y - menuH : y;

  return (
    <AnimatePresence>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.95, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -4 }}
        transition={{ duration: 0.1 }}
        className="fixed z-[1000] w-48 bg-[var(--bg-2)] border border-[var(--border-h)] rounded-lg p-1 shadow-[0_8px_30px_rgba(0,0,0,.3)]"
        style={{ top: adjustedY, left: adjustedX }}
      >
        {items.map((item, i) => {
          if (item.separator) {
            return <div key={`sep-${i}`} className="h-px bg-[var(--border)] my-1" />;
          }
          const Icon = item.icon ? iconMap[item.icon] : null;
          return (
            <button
              key={item.label}
              onClick={() => {
                item.action?.();
                onClose();
              }}
              className={cn(
                "flex items-center gap-2 w-full text-left px-2.5 py-1.5 text-[12px] font-medium rounded-md transition-colors",
                item.danger
                  ? "text-[var(--red)] hover:bg-[var(--red-dim)]"
                  : "text-[var(--t1)] hover:bg-[var(--bg-3)]/80"
              )}
            >
              {Icon && <Icon className="w-3.5 h-3.5 shrink-0 opacity-60" />}
              {item.label}
            </button>
          );
        })}
      </motion.div>
    </AnimatePresence>
  );
}
