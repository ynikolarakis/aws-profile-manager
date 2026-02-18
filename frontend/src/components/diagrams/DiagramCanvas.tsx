import { useCallback } from "react";
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { AwsResourceNode } from "./AwsResourceNode";
import { AwsGroupNode } from "./AwsGroupNode";

const nodeTypes = {
  awsResource: AwsResourceNode,
  awsGroup: AwsGroupNode,
};

/** AWS service category color legend */
const LEGEND_ITEMS = [
  { label: "Compute", color: "#ED7100" },
  { label: "Networking", color: "#8C4FFF" },
  { label: "Database", color: "#C925D1" },
  { label: "Storage", color: "#7AA116" },
  { label: "Integration", color: "#E7157B" },
  { label: "Security", color: "#DD344C" },
];

interface Props {
  initialNodes: Node[];
  initialEdges: Edge[];
}

export function DiagramCanvas({ initialNodes, initialEdges }: Props) {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const miniMapNodeColor = useCallback((node: Node) => {
    const d = node.data as Record<string, unknown>;
    return (d?.serviceColor as string) || "#71717a";
  }, []);

  return (
    <div className="flex-1 w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.05}
        maxZoom={3}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: "smoothstep",
          style: { strokeWidth: 1.5, stroke: "#666666" },
        }}
      >
        <Controls
          showInteractive={false}
          className="!bg-[var(--bg-1)] !border-[var(--border)] !shadow-sm [&>button]:!bg-[var(--bg-2)] [&>button]:!border-[var(--border)] [&>button]:!text-[var(--t2)] [&>button:hover]:!bg-[var(--bg-3)]"
        />
        <MiniMap
          nodeColor={miniMapNodeColor}
          className="!bg-[var(--bg-1)] !border-[var(--border)]"
          maskColor="rgba(0,0,0,0.15)"
          pannable
          zoomable
        />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--t4)" className="opacity-20" />
      </ReactFlow>

      {/* Color legend */}
      <div className="absolute bottom-3 right-3 bg-[var(--bg-1)]/90 backdrop-blur-sm border border-[var(--border)] rounded-lg px-3 py-2 flex flex-wrap gap-x-3 gap-y-1 max-w-[320px]">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[9px] text-[var(--t3)] whitespace-nowrap">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
