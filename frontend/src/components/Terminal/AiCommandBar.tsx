import { useStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Play, Copy, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function AiCommandBar() {
  const aiStreaming = useStore((s) => s.aiStreaming);
  const aiStreamedText = useStore((s) => s.aiStreamedText);
  const aiGeneratedCommand = useStore((s) => s.aiGeneratedCommand);
  const aiRunCommand = useStore((s) => s.aiRunCommand);
  const aiDismiss = useStore((s) => s.aiDismiss);

  if (!aiStreaming && !aiGeneratedCommand) return null;

  const handleCopy = () => {
    if (aiGeneratedCommand) {
      navigator.clipboard.writeText(aiGeneratedCommand);
    }
  };

  return (
    <div className="px-3.5 py-2 border-t border-[var(--border)] bg-[var(--bg-1)]">
      <div
        className={cn(
          "rounded-md border px-3 py-2 font-mono text-[12px]",
          aiGeneratedCommand
            ? "border-[var(--ac)] bg-[var(--ac)]/5"
            : "border-[var(--border)] bg-[var(--bg-0)]"
        )}
      >
        <div className="text-[var(--t1)] whitespace-pre-wrap break-all">
          {aiStreamedText || "..."}
          {aiStreaming && (
            <span className="inline-block w-1.5 h-3.5 bg-[var(--ac)] ml-0.5 animate-pulse" />
          )}
        </div>

        {aiGeneratedCommand && (
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-[var(--border)]">
            <Button
              size="sm"
              className="h-6 px-2.5 text-[11px] gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={aiRunCommand}
            >
              <Play className="w-3 h-3" />
              Run
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-2.5 text-[11px] gap-1"
              onClick={handleCopy}
            >
              <Copy className="w-3 h-3" />
              Copy
            </Button>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-[var(--t3)]"
              onClick={aiDismiss}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
