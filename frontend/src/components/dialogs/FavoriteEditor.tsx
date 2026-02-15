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

interface Props {
  data: Record<string, unknown>;
  onClose: () => void;
}

export function FavoriteEditor({ data, onClose }: Props) {
  const addFavorite = useStore((s) => s.addFavorite);

  const [label, setLabel] = useState((data.label as string) || "");
  const [cmd, setCmd] = useState((data.cmd as string) || "");

  const handleSave = async () => {
    if (!label.trim() || !cmd.trim()) return;
    await addFavorite(label.trim(), cmd.trim());
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Add Favorite</DialogTitle>
          <DialogDescription>Save a command for quick access</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-[var(--t3)] mb-1">Label</label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="My Command"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[var(--t3)] mb-1">Command</label>
            <Input
              value={cmd}
              onChange={(e) => setCmd(e.target.value)}
              placeholder="aws ..."
              className="font-mono"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!label.trim() || !cmd.trim()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
