import { memo } from "react";
import { type NodeProps } from "@xyflow/react";

interface AwsGroupData {
  label: string;
  resourceType: string;
  service: string;
  color: string;
  properties?: Record<string, unknown>;
}

function AwsGroupNodeInner({ data }: NodeProps) {
  const d = data as unknown as AwsGroupData;
  const isVpc = d.resourceType === "vpc";
  const cidr = (d.properties?.cidr as string) || "";

  return (
    <div
      className="w-full h-full rounded-lg border-2 border-dashed relative"
      style={{
        borderColor: d.color + "88",
        backgroundColor: d.color + "08",
      }}
    >
      <div
        className="absolute top-1.5 left-2.5 flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold"
        style={{ color: d.color, backgroundColor: d.color + "15" }}
      >
        <span>{isVpc ? "VPC" : "Subnet"}</span>
        <span className="font-normal opacity-70">{d.label}</span>
        {cidr && <span className="font-mono text-[9px] opacity-60">{cidr}</span>}
      </div>
    </div>
  );
}

export const AwsGroupNode = memo(AwsGroupNodeInner);
