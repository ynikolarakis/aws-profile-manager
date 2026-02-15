import { useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/store";

interface Props {
  onClose: () => void;
}

const QUICK_TEMPLATES = [
  { label: "Identity", cmd: "aws sts get-caller-identity" },
  { label: "S3 Buckets", cmd: "aws s3 ls" },
];

export function BulkRun({ onClose }: Props) {
  const profiles = useStore((s) => s.profiles);
  const bulkRun = useStore((s) => s.bulkRun);

  const [selected, setSelected] = useState<string[]>([]);
  const [cmd, setCmd] = useState("");

  const profileNames = Object.keys(profiles);

  const toggleProfile = (name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  };

  const selectAll = () => setSelected([...profileNames]);
  const selectNone = () => setSelected([]);

  const handleRun = () => {
    if (selected.length === 0 || !cmd.trim()) return;
    bulkRun(selected, cmd.trim());
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
          width: 420,
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Bulk Run</h2>

        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: "var(--t3)" }}>Profiles</label>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={selectAll} style={{ fontSize: 10, color: "var(--ac)" }}>All</button>
              <button onClick={selectNone} style={{ fontSize: 10, color: "var(--t3)" }}>None</button>
            </div>
          </div>
          <div
            style={{
              maxHeight: 180,
              overflowY: "auto",
              border: "1px solid var(--border)",
              borderRadius: "var(--r)",
              padding: 4,
            }}
          >
            {profileNames.map((name) => (
              <label
                key={name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "4px 8px",
                  borderRadius: "var(--r)",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(name)}
                  onChange={() => toggleProfile(name)}
                />
                {name}
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
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

        <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
          {QUICK_TEMPLATES.map((t) => (
            <button
              key={t.label}
              onClick={() => setCmd(t.cmd)}
              style={{
                fontSize: 11,
                color: "var(--t3)",
                padding: "4px 8px",
                borderRadius: "var(--r)",
                border: "1px solid var(--border)",
              }}
            >
              {t.label}
            </button>
          ))}
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
            onClick={handleRun}
            disabled={selected.length === 0 || !cmd.trim()}
            style={{
              height: 32,
              padding: "0 16px",
              fontSize: 12,
              fontWeight: 500,
              color: "#fff",
              background: "var(--ac)",
              borderRadius: "var(--r)",
              opacity: selected.length > 0 && cmd.trim() ? 1 : 0.5,
            }}
          >
            Run on {selected.length} profile{selected.length !== 1 ? "s" : ""}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
