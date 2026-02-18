import { useEffect, useMemo } from "react";
import { useStore } from "@/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ReactFlowProvider, type Node, type Edge } from "@xyflow/react";

import { DiagramCanvas } from "./DiagramCanvas";
import { DiagramToolbar } from "./DiagramToolbar";
import { ScanProgress } from "./ScanProgress";

interface Props {
  data: Record<string, unknown>;
  onClose: () => void;
}

export function InfraDiagram({ data, onClose }: Props) {
  const profile = (data.profile as string) || undefined;
  const startInfraScan = useStore((s) => s.startInfraScan);
  const infraScanning = useStore((s) => s.infraScanning);
  const infraScanProgress = useStore((s) => s.infraScanProgress);
  const infraGraph = useStore((s) => s.infraGraph);
  const infraDiagramNodes = useStore((s) => s.infraDiagramNodes);
  const infraDiagramEdges = useStore((s) => s.infraDiagramEdges);
  const infraLlmResult = useStore((s) => s.infraLlmResult);
  const infraLayoutMode = useStore((s) => s.infraLayoutMode);

  useEffect(() => {
    startInfraScan(profile);
  }, [profile, startInfraScan]);

  const handleRescan = () => startInfraScan(profile);

  const resourceCount = infraGraph ? Object.keys(infraGraph.resources).length : 0;
  const edgeCount = infraGraph ? infraGraph.edges.length : 0;
  const errorCount = infraGraph?.scan_errors?.length || 0;

  const showDiagram = !infraScanning && infraDiagramNodes.length > 0;
  const showEmpty = !infraScanning && infraGraph && resourceCount === 0;

  // Memoize nodes/edges to avoid re-creating on every render
  const nodes = useMemo(() => infraDiagramNodes as Node[], [infraDiagramNodes]);
  const edges = useMemo(() => infraDiagramEdges as Edge[], [infraDiagramEdges]);

  // Annotations from LLM
  const annotations = infraLayoutMode === "llm" ? infraLlmResult?.annotations : null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[90vh] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-3 pb-0 shrink-0">
          <DialogTitle className="text-[14px]">
            Architecture Diagram
            {infraGraph?.profile && (
              <span className="ml-2 font-mono text-[var(--t3)] font-normal">
                {infraGraph.profile}
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="text-[11px]">
            {infraScanning
              ? "Scanning infrastructure..."
              : resourceCount > 0
                ? `${resourceCount} resources, ${edgeCount} relationships${errorCount > 0 ? `, ${errorCount} scan errors` : ""}`
                : "No resources found"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          {/* Scanning progress overlay */}
          {infraScanning && (
            <ScanProgress progress={infraScanProgress} scanning={infraScanning} />
          )}

          {/* Empty state */}
          {showEmpty && (
            <div className="flex-1 flex items-center justify-center text-[var(--t3)]">
              <div className="text-center">
                <p className="text-[14px] mb-2">No resources discovered</p>
                <p className="text-[11px] text-[var(--t4)]">
                  Check that the profile has the necessary permissions to list resources.
                </p>
              </div>
            </div>
          )}

          {/* Diagram */}
          {showDiagram && (
            <ReactFlowProvider>
              <DiagramToolbar onRescan={handleRescan} />
              <div className="flex flex-1 min-h-0">
                <DiagramCanvas initialNodes={nodes} initialEdges={edges} />
                {/* LLM annotations sidebar */}
                {annotations && annotations.length > 0 && (
                  <div className="w-64 border-l border-[var(--border)] bg-[var(--bg-1)] overflow-y-auto p-3 shrink-0">
                    <h4 className="text-[11px] font-semibold text-[var(--t3)] uppercase tracking-wider mb-2">
                      AI Observations
                    </h4>
                    <div className="space-y-2">
                      {annotations.map((note, i) => (
                        <div key={i} className="text-[11px] text-[var(--t2)] bg-[var(--bg-2)] rounded-md p-2 leading-relaxed">
                          {note}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ReactFlowProvider>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
