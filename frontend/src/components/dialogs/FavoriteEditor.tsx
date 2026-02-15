import { useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/store";

interface Props {
  data: Record<string, unknown>;
  onClose: () => void;
}

export function FavoriteEditor({ data, onClose }: Props) {
  const addFavorite = useStore((s) => s.addFavorite);

  const [label, setLabel] = useState((data.label as string) || "");
  const [cmd, setCmd] = useState((data.cmd as string) || "");

  const handleSave = async () => {
    if (!label.trim() || !cmd.trim()) return;
    await addFavorite(label.trim(), cmd.trim());
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.15 }}
        style={{
          background: "var(--bg-1)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-lg)",
          padding: 24,
          width: 400,
        }}
      >
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Add Favorite</h2>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 500, color: "var(--t3)", marginBottom: 4, display: "block" }}>
            Label
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="My Command"
            style={{
              width: "100%",
              height: 32,
              padding: "0 10px",
              background: "var(--bg-0)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r)",
              color: "var(--t1)",
              fontSize: 12,
              outline: "none",
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 500, color: "var(--t3)", marginBottom: 4, display: "block" }}>
            Command
          </label>
          <input
            type="text"
            value={cmd}
            onChange={(e) => setCmd(e.target.value)}
            placeholder="aws ..."
            style={{
              width: "100%",
              height: 32,
              padding: "0 10px",
              background: "var(--bg-0)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r)",
              color: "var(--t1)",
              fontFamily: "var(--mono)",
              fontSize: 12,
              outline: "none",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              height: 32,
              padding: "0 16px",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--t2)",
              borderRadius: "var(--r)",
              border: "1px solid var(--border)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!label.trim() || !cmd.trim()}
            style={{
              height: 32,
              padding: "0 16px",
              fontSize: 12,
              fontWeight: 500,
              color: "#fff",
              background: "var(--ac)",
              borderRadius: "var(--r)",
              opacity: label.trim() && cmd.trim() ? 1 : 0.5,
            }}
          >
            Save
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
