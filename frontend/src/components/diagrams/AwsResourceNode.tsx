import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

const SERVICE_ICONS: Record<string, string> = {
  EC2: "\u{1F5A5}\uFE0F",
  VPC: "\u{1F310}",
  RDS: "\u{1F4BE}",
  S3: "\u{1FAA3}",
  Lambda: "\u{26A1}",
  ELB: "\u{2696}\uFE0F",
  ECS: "\u{1F433}",
  DynamoDB: "\u{1F4CA}",
  SQS: "\u{1F4E8}",
  SNS: "\u{1F514}",
  CloudFront: "\u{1F30D}",
  Route53: "\u{1F9ED}",
  "API Gateway": "\u{1F6AA}",
  ElastiCache: "\u{26A1}",
  IAM: "\u{1F512}",
  KMS: "\u{1F511}",
  CloudWatch: "\u{1F4C8}",
};

interface AwsResourceData {
  label: string;
  resourceType: string;
  service: string;
  color: string;
  arn?: string;
  properties?: Record<string, unknown>;
  tags?: Record<string, string>;
}

function AwsResourceNodeInner({ data }: NodeProps) {
  const d = data as unknown as AwsResourceData;
  const icon = SERVICE_ICONS[d.service] || "\u2601\uFE0F";

  return (
    <div className="flex flex-col items-center gap-0.5 min-w-[50px]">
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-[var(--t4)]" />
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shadow-sm border border-white/20"
        style={{ backgroundColor: d.color + "22", borderColor: d.color + "44" }}
      >
        {icon}
      </div>
      <span className="text-[10px] font-medium text-[var(--t1)] max-w-[100px] truncate text-center leading-tight">
        {d.label}
      </span>
      <span className="text-[8px] text-[var(--t4)] leading-tight">
        {d.resourceType.replace(/_/g, " ")}
      </span>
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-[var(--t4)]" />
    </div>
  );
}

export const AwsResourceNode = memo(AwsResourceNodeInner);
