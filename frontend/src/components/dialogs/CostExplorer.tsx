import { useState, useEffect } from "react";
import { useStore } from "@/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

interface Props {
  data: Record<string, unknown>;
  onClose: () => void;
}

export function CostExplorer({ data, onClose }: Props) {
  const profile = (data.profile as string) || "";
  const getCost = useStore((s) => s.getCost);
  const costData = useStore((s) => s.costData);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCost(profile, year, month).then(() => setLoading(false));
  }, [profile, year, month, getCost]);

  useEffect(() => {
    if (costData) setLoading(false);
  }, [costData]);

  const maxCost = costData?.services?.[0]?.cost || 1;

  const handlePrev = () => {
    if (month === 1) { setYear(year - 1); setMonth(12); }
    else setMonth(month - 1);
  };

  const handleNext = () => {
    if (month === 12) { setYear(year + 1); setMonth(1); }
    else setMonth(month + 1);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[480px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cost Explorer</DialogTitle>
          <DialogDescription className="font-mono">{profile}</DialogDescription>
        </DialogHeader>

        {/* Month navigator */}
        <div className="flex items-center gap-3 mb-3">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={handlePrev}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-[13px] font-medium font-mono">
            {year}-{String(month).padStart(2, "0")}
          </span>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleNext}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-[var(--t3)] gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-[12px]">Loading cost data...</span>
          </div>
        ) : costData?.error ? (
          <div className="text-center py-10 text-[var(--red)] text-[12px]">{costData.error}</div>
        ) : (
          <>
            {/* Total */}
            <div className="text-[28px] font-bold text-[var(--ac)] mb-4">
              ${costData?.total?.toFixed(2)}
            </div>

            {/* Service breakdown */}
            <div className="space-y-2.5">
              {costData?.services?.map((svc) => (
                <div key={svc.name}>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-[11px] text-[var(--t2)] truncate max-w-[300px]">
                      {svc.name}
                    </span>
                    <span className="text-[11px] font-mono text-[var(--t3)]">
                      ${svc.cost.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-[var(--bg-3)] overflow-hidden">
                    <div
                      className="h-full bg-[var(--ac)] rounded-full transition-all duration-300"
                      style={{ width: `${(svc.cost / maxCost) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
