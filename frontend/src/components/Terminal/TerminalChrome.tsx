import { useStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function TerminalChrome() {
  const active = useStore((s) => s.active);
  const terminalBusy = useStore((s) => s.terminalBusy);
  const clearTerminal = useStore((s) => s.clearTerminal);
  const aiMode = useStore((s) => s.aiMode);
  const toggleAiMode = useStore((s) => s.toggleAiMode);

  return (
    <div className="flex items-center gap-2 px-3.5 py-1.5 bg-[var(--bg-2)] border-b border-[var(--border)] shrink-0">
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{
          background: terminalBusy ? "var(--amber)" : "var(--green)",
          boxShadow: `0 0 6px ${terminalBusy ? "var(--amber)" : "var(--green)"}`,
        }}
      />
      <Badge variant="secondary" className="text-[10px] font-mono gap-1">
        {active || "terminal"}
      </Badge>

      {terminalBusy && (
        <Loader2 className="w-3 h-3 text-[var(--t3)] animate-spin" />
      )}

      <div className="flex-1" />

      <Button
        variant={aiMode ? "default" : "ghost"}
        size="sm"
        className={cn(
          "text-[11px] h-6 px-2 gap-1",
          aiMode
            ? "bg-[var(--ac)] text-white hover:bg-[var(--ac)]/90"
            : "text-[var(--t3)]"
        )}
        onClick={toggleAiMode}
      >
        <Sparkles className="w-3 h-3" />
        AI
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="text-[11px] text-[var(--t3)] h-6 px-2 gap-1"
        onClick={clearTerminal}
      >
        <Trash2 className="w-3 h-3" />
        Clear
      </Button>
    </div>
  );
}
