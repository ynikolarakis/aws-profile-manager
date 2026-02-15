import { useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/store";

interface Props {
  data: Record<string, unknown>;
  onClose: () => void;
}

const COLOR_PRESETS = [
  "#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6",
  "#ec4899", "#06b6d4", "#14b8a6", "#f97316", "#6366f1",
];

export function CategoryEditor({ data, onClose }: Props) {
  const addCategory = useStore((s) => s.addCategory);
  const editCategory = useStore((s) => s.editCategory);
  const deleteCategory = useStore((s) => s.deleteCategory);

  const isEdit = !!data.cid;
  const [name, setName] = useState((data.name as string) || "");
  const [color, setColor] = useState((data.color as string) || COLOR_PRESETS[0]);

  const handleSave = async () => {
    if (!name.trim()) return;
    if (isEdit) {
      await editCategory(data.cid as string, name.trim(), color);
    } else {
      await addCategory(name.trim(), color);
    }
    onClose();
  };

  const handleDelete = async () => {
    if (isEdit && window.confirm(`Delete category "${data.name}"?`)) {
      await deleteCategory(data.cid as string);
      onClose();
    }
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
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        style={{
          background: "var(--bg-1)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-lg)",
          padding: 24,
          width: 360,
        }}
      >
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
          {isEdit ? "Edit Category" : "New Category"}
        </h2>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 500, color: "var(--t3)", marginBottom: 4, display: "block" }}>
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Category name"
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

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 500, color: "var(--t3)", marginBottom: 8, display: "block" }}>
            Color
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: c,
                  border: color === c ? "2px solid var(--t1)" : "2px solid transparent",
                  outline: color === c ? "2px solid var(--ac)" : "none",
                  outlineOffset: 2,
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          {isEdit && (
            <button
              onClick={handleDelete}
              style={{
                height: 32,
                padding: "0 12px",
                fontSize: 12,
                fontWeight: 500,
                color: "var(--red)",
                borderRadius: "var(--r)",
                border: "1px solid var(--red-dim)",
                marginRight: "auto",
              }}
            >
              Delete
            </button>
          )}
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
            disabled={!name.trim()}
            style={{
              height: 32,
              padding: "0 16px",
              fontSize: 12,
              fontWeight: 500,
              color: "#fff",
              background: "var(--ac)",
              borderRadius: "var(--r)",
              opacity: name.trim() ? 1 : 0.5,
            }}
          >
            {isEdit ? "Save" : "Create"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
