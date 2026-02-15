import { useState, useRef, type KeyboardEvent } from "react";
import { useStore } from "@/store";

export function TerminalInput() {
  const [input, setInput] = useState("");
  const [historyIdx, setHistoryIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const runCommand = useStore((s) => s.runCommand);
  const terminalBusy = useStore((s) => s.terminalBusy);
  const terminalHistory = useStore((s) => s.terminalHistory);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && input.trim() && !terminalBusy) {
      runCommand(input.trim());
      setInput("");
      setHistoryIdx(-1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const nextIdx = Math.min(historyIdx + 1, terminalHistory.length - 1);
      if (terminalHistory[nextIdx]) {
        setHistoryIdx(nextIdx);
        setInput(terminalHistory[nextIdx]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIdx = historyIdx - 1;
      if (nextIdx < 0) {
        setHistoryIdx(-1);
        setInput("");
      } else {
        setHistoryIdx(nextIdx);
        setInput(terminalHistory[nextIdx]);
      }
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 14px",
        borderTop: "1px solid var(--border)",
        background: "var(--bg-1)",
        flexShrink: 0,
      }}
    >
      <span style={{ color: "var(--ac)", fontFamily: "var(--mono)", fontSize: 13 }}>
        &#10095;
      </span>
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={terminalBusy}
        placeholder={terminalBusy ? "Running..." : "Type a command..."}
        style={{
          flex: 1,
          background: "none",
          border: "none",
          outline: "none",
          color: "var(--t1)",
          fontFamily: "var(--mono)",
          fontSize: 12,
          opacity: terminalBusy ? 0.5 : 1,
        }}
      />
      <button
        onClick={() => {
          if (input.trim() && !terminalBusy) {
            runCommand(input.trim());
            setInput("");
            setHistoryIdx(-1);
          }
        }}
        disabled={terminalBusy || !input.trim()}
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: input.trim() && !terminalBusy ? "var(--ac)" : "var(--t4)",
          padding: "4px 10px",
          borderRadius: "var(--r)",
          border: "1px solid var(--border)",
          transition: "all .1s",
        }}
      >
        Run
      </button>
    </div>
  );
}
