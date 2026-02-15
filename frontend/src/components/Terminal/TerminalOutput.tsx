import { useEffect, useRef } from "react";
import { useStore } from "@/store";

const lineStyles: Record<string, { color: string }> = {
  prompt: { color: "var(--ac)" },
  cmd: { color: "var(--cyan)" },
  error: { color: "var(--red)" },
  info: { color: "var(--amber)" },
  output: { color: "var(--t2)" },
};

export function TerminalOutput() {
  const lines = useStore((s) => s.terminalLines);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div
      ref={scrollRef}
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "8px 14px",
        fontFamily: "var(--mono)",
        fontSize: 12,
        lineHeight: 1.6,
        background: "var(--bg-0)",
      }}
    >
      {lines.map((line) => (
        <div key={line.id} style={lineStyles[line.type] || lineStyles.output}>
          <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
            {line.text}
          </span>
        </div>
      ))}
    </div>
  );
}
