import { useStore } from "@/store";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function IdentityBar() {
  const identity = useStore((s) => s.identity);

  const hasError = identity?.error;

  return (
    <div className="flex items-center gap-2 px-3.5 py-1.5 border-b border-[var(--border)] bg-[var(--bg-1)] shrink-0">
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{
          background: hasError ? "var(--amber)" : "var(--green)",
          boxShadow: `0 0 6px ${hasError ? "var(--amber)" : "var(--green)"}`,
        }}
      />

      {hasError ? (
        <span className="text-[11px] font-mono text-[var(--amber)] truncate">
          {identity.error}
        </span>
      ) : identity ? (
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="secondary" className="text-[10px] font-mono shrink-0">
            {identity.account}
          </Badge>
          <span className={cn("text-[11px] font-mono text-[var(--t2)] truncate")}>
            {identity.arn}
          </span>
        </div>
      ) : (
        <span className="text-[11px] font-mono text-[var(--t3)]">
          Checking identity...
        </span>
      )}
    </div>
  );
}
