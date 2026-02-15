import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Play } from "lucide-react";

interface Props {
  onClose: () => void;
}

const QUICK_TEMPLATES = [
  { label: "Identity", cmd: "aws sts get-caller-identity" },
  { label: "S3 Buckets", cmd: "aws s3 ls" },
];

export function BulkRun({ onClose }: Props) {
  const profiles = useStore((s) => s.profiles);
  const bulkRun = useStore((s) => s.bulkRun);

  const [selected, setSelected] = useState<string[]>([]);
  const [cmd, setCmd] = useState("");

  const profileNames = Object.keys(profiles);

  const toggleProfile = (name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  };

  const selectAll = () => setSelected([...profileNames]);
  const selectNone = () => setSelected([]);

  const handleRun = () => {
    if (selected.length === 0 || !cmd.trim()) return;
    bulkRun(selected, cmd.trim());
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[420px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Run</DialogTitle>
          <DialogDescription>Run a command across multiple profiles</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Profile selector */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[11px] font-medium text-[var(--t3)]">Profiles</label>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-[10px] text-[var(--ac)] hover:underline">All</button>
                <button onClick={selectNone} className="text-[10px] text-[var(--t3)] hover:underline">None</button>
              </div>
            </div>
            <div className="max-h-[180px] overflow-y-auto border border-[var(--border)] rounded-md p-1 space-y-0.5">
              {profileNames.map((name) => (
                <label
                  key={name}
                  className="flex items-center gap-2.5 px-2 py-1 rounded-md cursor-pointer text-[12px] hover:bg-[var(--bg-2)]/50 transition-colors"
                >
                  <Checkbox
                    checked={selected.includes(name)}
                    onCheckedChange={() => toggleProfile(name)}
                  />
                  {name}
                </label>
              ))}
            </div>
          </div>

          {/* Command input */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--t3)] mb-1">Command</label>
            <Input
              value={cmd}
              onChange={(e) => setCmd(e.target.value)}
              placeholder="aws ..."
              className="font-mono"
            />
          </div>

          {/* Quick templates */}
          <div className="flex gap-1.5">
            {QUICK_TEMPLATES.map((t) => (
              <Badge
                key={t.label}
                variant="outline"
                className="cursor-pointer hover:bg-[var(--bg-2)] transition-colors"
                onClick={() => setCmd(t.cmd)}
              >
                {t.label}
              </Badge>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleRun}
            disabled={selected.length === 0 || !cmd.trim()}
            className="gap-1"
          >
            <Play className="w-3.5 h-3.5" />
            Run on {selected.length} profile{selected.length !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
