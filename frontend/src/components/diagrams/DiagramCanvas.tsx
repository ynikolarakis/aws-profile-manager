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

interface Props {
  initialNodes: Node[];
  initialEdges: Edge[];
}

export function DiagramCanvas({ initialNodes, initialEdges }: Props) {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const miniMapNodeColor = useCallback((node: Node) => {
    const color = (node.data as Record<string, unknown>)?.color as string;
    return color || "#71717a";
  }, []);

  return (
    <div className="flex-1 w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={3}
        proOptions={{ hideAttribution: true }}
      >
        <Controls
          showInteractive={false}
          className="!bg-[var(--bg-1)] !border-[var(--border)] !shadow-sm [&>button]:!bg-[var(--bg-2)] [&>button]:!border-[var(--border)] [&>button]:!text-[var(--t2)] [&>button:hover]:!bg-[var(--bg-3)]"
        />
        <MiniMap
          nodeColor={miniMapNodeColor}
          className="!bg-[var(--bg-1)] !border-[var(--border)]"
          maskColor="rgba(0,0,0,0.15)"
        />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="var(--t4)" className="opacity-30" />
      </ReactFlow>
    </div>
  );
}
