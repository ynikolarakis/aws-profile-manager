import { useStore } from "@/store";

export function TerminalChrome() {
  const active = useStore((s) => s.active);
  const terminalBusy = useStore((s) => s.terminalBusy);
  const clearTerminal = useStore((s) => s.clearTerminal);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 14px",
        background: "var(--bg-2)",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: terminalBusy ? "var(--amber)" : "var(--green)",
          boxShadow: `0 0 6px ${terminalBusy ? "var(--amber)" : "var(--green)"}`,
        }}
      />
      <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--t2)", flex: 1 }}>
        {active || "terminal"}
      </span>
      <button
        onClick={clearTerminal}
        style={{
          fontSize: 11,
          color: "var(--t3)",
          padding: "2px 6px",
          borderRadius: "var(--r)",
          transition: "all .1s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--t1)";
          e.currentTarget.style.background = "var(--bg-3)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--t3)";
          e.currentTarget.style.background = "none";
        }}
      >
        Clear
      </button>
    </div>
  );
}
