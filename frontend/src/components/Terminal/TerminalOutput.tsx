import { useEffect, useRef } from "react";
import { useStore } from "@/store";
import { TerminalSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const lineStyles: Record<string, string> = {
  prompt: "text-[var(--ac)] font-medium",
  cmd: "text-[var(--cyan)]",
  error: "text-[var(--red)]",
  info: "text-[var(--amber)]",
  output: "text-[var(--t2)]",
  "ai-command": "text-[var(--ac)]",
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
      className="flex-1 overflow-y-auto p-3.5 font-mono text-[12px] leading-relaxed bg-[var(--bg-0)]"
    >
      {lines.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-[var(--t4)] gap-3">
          <TerminalSquare className="w-8 h-8 opacity-30" />
          <div className="text-center">
            <div className="text-[13px] font-medium mb-1">Run a command to get started</div>
            <div className="text-[11px] text-[var(--t4)]">
              Try <kbd>aws sts get-caller-identity</kbd> or <kbd>aws s3 ls</kbd>
            </div>
          </div>
        </div>
      ) : (
        lines.map((line) => {
          const isPrompt = line.type === "prompt";
          const isAiCmd = line.type === "ai-command";
          return (
            <div
              key={line.id}
              className={cn(
                isPrompt && "mt-2 pt-2 border-t border-dashed border-[var(--border)] first:mt-0 first:pt-0 first:border-t-0",
                isAiCmd && "mt-1 px-2 py-1 rounded border border-[var(--ac)]/30 bg-[var(--ac)]/5"
              )}
            >
              <span className={cn("whitespace-pre-wrap break-all", lineStyles[line.type] || lineStyles.output)}>
                {line.text}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}
