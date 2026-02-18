import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { InfraScanProgress } from "@/types";

interface Props {
  progress: InfraScanProgress[];
  scanning: boolean;
}

export function ScanProgress({ progress, scanning }: Props) {
  const total = progress.length > 0 ? progress[0].total : 17;
  const done = progress.filter((p) => p.status === "done").length;
  const errors = progress.filter((p) => p.status === "error").length;
  const pct = total > 0 ? ((done + errors) / total) * 100 : 0;

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
      <Loader2 className="w-8 h-8 animate-spin text-[var(--ac)]" />
      <div className="text-[14px] font-medium text-[var(--t1)]">
        Scanning AWS Infrastructure...
      </div>

      {/* Progress bar */}
      <div className="w-64 h-1.5 rounded-full bg-[var(--bg-3)] overflow-hidden">
        <div
          className="h-full bg-[var(--ac)] rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] text-[var(--t3)]">
        {done + errors} / {total} services{errors > 0 ? ` (${errors} errors)` : ""}
      </span>

      {/* Service list */}
      <div className="w-72 max-h-[260px] overflow-y-auto space-y-1 mt-2">
        {progress.map((p) => (
          <div key={p.service} className="flex items-center gap-2 py-0.5 px-2">
            {p.status === "scanning" && (
              <Loader2 className="w-3 h-3 animate-spin text-[var(--ac)] shrink-0" />
            )}
            {p.status === "done" && (
              <CheckCircle2 className="w-3 h-3 text-[var(--green)] shrink-0" />
            )}
            {p.status === "error" && (
              <XCircle className="w-3 h-3 text-[var(--red)] shrink-0" />
            )}
            <span className="text-[11px] text-[var(--t2)] flex-1">{p.service}</span>
            {p.status === "error" && p.error && (
              <span className="text-[9px] text-[var(--red)] truncate max-w-[120px]" title={p.error}>
                {p.error}
              </span>
            )}
          </div>
        ))}
      </div>

      {!scanning && progress.length > 0 && (
        <span className="text-[11px] text-[var(--t3)]">Generating diagram...</span>
      )}
    </div>
  );
}
