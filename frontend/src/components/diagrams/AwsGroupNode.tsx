import { memo } from "react";
import { type NodeProps } from "@xyflow/react";

/** AWS group visual styles per type, following official AWS conventions */
const GROUP_STYLES: Record<
  string,
  { border: string; bg: string; dashed: boolean; labelBg: string; labelColor: string; icon: string }
> = {
  vpc: {
    border: "#8C4FFF",
    bg: "rgba(140,79,255,0.03)",
    dashed: true,
    labelBg: "rgba(140,79,255,0.12)",
    labelColor: "#8C4FFF",
    icon: "\uD83D\uDD12",
  },
  "public-subnet": {
    border: "#7AA116",
    bg: "rgba(122,161,22,0.05)",
    dashed: false,
    labelBg: "rgba(122,161,22,0.15)",
    labelColor: "#7AA116",
    icon: "\uD83C\uDF10",
  },
  "private-subnet": {
    border: "#147eba",
    bg: "rgba(20,126,186,0.05)",
    dashed: false,
    labelBg: "rgba(20,126,186,0.15)",
    labelColor: "#147eba",
    icon: "\uD83D\uDD12",
  },
  region: {
    border: "#147eba",
    bg: "rgba(20,126,186,0.02)",
    dashed: true,
    labelBg: "rgba(20,126,186,0.10)",
    labelColor: "#147eba",
    icon: "\uD83C\uDF0D",
  },
};

const DEFAULT_STYLE = GROUP_STYLES["vpc"];

interface AwsGroupData {
  label: string;
  resourceType: string;
  service: string;
  groupType: string;
  serviceColor: string;
  properties?: Record<string, unknown>;
}

function AwsGroupNodeInner({ data }: NodeProps) {
  const d = data as unknown as AwsGroupData;
  const style = GROUP_STYLES[d.groupType] || DEFAULT_STYLE;
  const cidr = (d.properties?.cidr as string) || "";
  const az = (d.properties?.az as string) || "";

  // Determine display label
  const typeLabel =
    d.groupType === "vpc"
      ? "VPC"
      : d.groupType === "public-subnet"
        ? "Public Subnet"
        : d.groupType === "private-subnet"
          ? "Private Subnet"
          : d.groupType === "region"
            ? "Region"
            : "Group";

  return (
    <div
      className="w-full h-full rounded-lg relative"
      style={{
        border: `2px ${style.dashed ? "dashed" : "solid"} ${style.border}`,
        backgroundColor: style.bg,
      }}
    >
      {/* Title badge — top left */}
      <div
        className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold select-none"
        style={{ backgroundColor: style.labelBg, color: style.labelColor }}
      >
        <span>{style.icon}</span>
        <span>{typeLabel}</span>
        {d.label && d.label !== d.resourceType && (
          <span className="font-normal opacity-70 max-w-[150px] truncate">{d.label}</span>
        )}
        {cidr && (
          <span className="font-mono text-[9px] opacity-60 ml-1">{cidr}</span>
        )}
        {az && (
          <span className="font-mono text-[9px] opacity-60 ml-1">{az}</span>
        )}
      </div>
    </div>
  );
}

export const AwsGroupNode = memo(AwsGroupNodeInner);
