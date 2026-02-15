import { useState, useRef, type KeyboardEvent } from "react";
import { useStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Play, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function TerminalInput() {
  const [input, setInput] = useState("");
  const [historyIdx, setHistoryIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const runCommand = useStore((s) => s.runCommand);
  const terminalBusy = useStore((s) => s.terminalBusy);
  const terminalHistory = useStore((s) => s.terminalHistory);
  const aiMode = useStore((s) => s.aiMode);
  const aiStreaming = useStore((s) => s.aiStreaming);
  const aiGenerate = useStore((s) => s.aiGenerate);

  const isDisabled = terminalBusy || aiStreaming;

  const handleSubmit = () => {
    if (!input.trim() || isDisabled) return;
    if (aiMode) {
      aiGenerate(input.trim());
    } else {
      runCommand(input.trim());
    }
    setInput("");
    setHistoryIdx(-1);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    } else if (e.key === "ArrowUp" && !aiMode) {
      e.preventDefault();
      const nextIdx = Math.min(historyIdx + 1, terminalHistory.length - 1);
      if (terminalHistory[nextIdx]) {
        setHistoryIdx(nextIdx);
        setInput(terminalHistory[nextIdx]);
      }
    } else if (e.key === "ArrowDown" && !aiMode) {
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
    <div className="flex items-center gap-2 px-3.5 py-2 border-t border-[var(--border)] bg-[var(--bg-1)] shrink-0">
      {aiMode ? (
        <Sparkles className="w-3.5 h-3.5 text-[var(--ac)] shrink-0" />
      ) : (
        <span className="text-[var(--ac)] font-mono text-[13px] font-medium">&#10095;</span>
      )}
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isDisabled}
        placeholder={
          isDisabled
            ? aiStreaming ? "Generating..." : "Running..."
            : aiMode
              ? "Describe what you want to do..."
              : "Type a command..."
        }
        className={cn(
          "flex-1 bg-transparent border-none outline-none text-[var(--t1)] font-mono text-[12px]",
          "placeholder:text-[var(--t4)] disabled:opacity-50",
          "focus-visible:outline-none"
        )}
      />
      <div className="flex items-center gap-1.5">
        <kbd className="text-[9px]">{aiMode ? "Ctrl+I" : "Ctrl+/"}</kbd>
        <Button
          variant="outline"
          size="sm"
          className="h-6 px-2.5 text-[11px] gap-1"
          onClick={handleSubmit}
          disabled={isDisabled || !input.trim()}
        >
          {aiMode ? (
            <>
              <Sparkles className="w-3 h-3" />
              Generate
            </>
          ) : (
            <>
              <Play className="w-3 h-3" />
              Run
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
