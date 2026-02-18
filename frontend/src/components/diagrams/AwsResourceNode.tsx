import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

interface AwsResourceData {
  label: string;
  resourceType: string;
  service: string;
  serviceColor: string;
  icon: string;
  count: number;
  collapsed: boolean;
  arn?: string;
  properties?: Record<string, unknown>;
  tags?: Record<string, string>;
}

function AwsResourceNodeInner({ data }: NodeProps) {
  const d = data as unknown as AwsResourceData;
  const count = d.count || 1;
  const isCollapsed = d.collapsed || count > 1;

  return (
    <div
      className="relative flex items-center gap-2 bg-[var(--bg-1)] border border-[var(--border)] rounded-lg px-2.5 py-2 shadow-sm hover:shadow-md transition-shadow min-w-[130px] max-w-[160px]"
      style={{ borderLeftWidth: 3, borderLeftColor: d.serviceColor }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-[var(--t4)] !border-[var(--border)]"
      />

      {/* Service icon badge */}
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center text-sm shrink-0"
        style={{ backgroundColor: d.serviceColor + "18", color: d.serviceColor }}
      >
        {d.icon || "\u2601\uFE0F"}
      </div>

      {/* Label + type */}
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-[10px] font-semibold text-[var(--t1)] truncate leading-tight">
          {d.label}
        </span>
        <span className="text-[8px] text-[var(--t4)] leading-tight mt-0.5">
          {d.service}
        </span>
      </div>

      {/* Count badge for collapsed groups */}
      {isCollapsed && count > 1 && (
        <div
          className="absolute -top-2 -right-2 text-white text-[8px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-sm"
          style={{ backgroundColor: d.serviceColor }}
        >
          {count}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-[var(--t4)] !border-[var(--border)]"
      />
    </div>
  );
}

export const AwsResourceNode = memo(AwsResourceNodeInner);
