import { useStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Download, RefreshCw, Maximize, Sparkles, Cpu, Loader2 } from "lucide-react";
import { useReactFlow } from "@xyflow/react";

interface Props {
  onRescan: () => void;
}

export function DiagramToolbar({ onRescan }: Props) {
  const infraLayoutMode = useStore((s) => s.infraLayoutMode);
  const setInfraLayoutMode = useStore((s) => s.setInfraLayoutMode);
  const exportDrawio = useStore((s) => s.exportDrawio);
  const infraLlmLoading = useStore((s) => s.infraLlmLoading);
  const hasLlm = useStore((s) => s.has_llm_configured);
  const { fitView } = useReactFlow();

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[var(--border)] bg-[var(--bg-1)]">
        {/* Layout mode toggle */}
        <div className="flex items-center gap-0.5 bg-[var(--bg-2)] rounded-md p-0.5">
          <button
            onClick={() => setInfraLayoutMode("algorithmic")}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              infraLayoutMode === "algorithmic"
                ? "bg-[var(--ac)] text-white"
                : "text-[var(--t3)] hover:text-[var(--t1)]"
            }`}
          >
            <Cpu className="w-3 h-3" />
            Algorithmic
          </button>
          <button
            onClick={() => hasLlm && setInfraLayoutMode("llm")}
            disabled={!hasLlm}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              infraLayoutMode === "llm"
                ? "bg-[var(--ac)] text-white"
                : hasLlm
                  ? "text-[var(--t3)] hover:text-[var(--t1)]"
                  : "text-[var(--t4)] cursor-not-allowed"
            }`}
          >
            {infraLlmLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            LLM
          </button>
        </div>

        <div className="flex-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => fitView({ padding: 0.2 })}>
              <Maximize className="w-3.5 h-3.5 text-[var(--t3)]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Fit view</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRescan}>
              <RefreshCw className="w-3.5 h-3.5 text-[var(--t3)]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Re-scan</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => exportDrawio()}>
              <Download className="w-3.5 h-3.5 text-[var(--t3)]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Export .drawio</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
