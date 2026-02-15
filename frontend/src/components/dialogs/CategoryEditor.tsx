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
import { cn } from "@/lib/utils";

interface Props {
  data: Record<string, unknown>;
  onClose: () => void;
}

const COLOR_PRESETS = [
  "#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6",
  "#ec4899", "#06b6d4", "#14b8a6", "#f97316", "#6366f1",
];

export function CategoryEditor({ data, onClose }: Props) {
  const addCategory = useStore((s) => s.addCategory);
  const editCategory = useStore((s) => s.editCategory);
  const deleteCategory = useStore((s) => s.deleteCategory);

  const isEdit = !!data.cid;
  const [name, setName] = useState((data.name as string) || "");
  const [color, setColor] = useState((data.color as string) || COLOR_PRESETS[0]);

  const handleSave = async () => {
    if (!name.trim()) return;
    if (isEdit) {
      await editCategory(data.cid as string, name.trim(), color);
    } else {
      await addCategory(name.trim(), color);
    }
    onClose();
  };

  const handleDelete = async () => {
    if (isEdit && window.confirm(`Delete category "${data.name}"?`)) {
      await deleteCategory(data.cid as string);
      onClose();
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[360px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Category" : "New Category"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Modify category settings" : "Create a category to group profiles"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-[var(--t3)] mb-1">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Category name"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[var(--t3)] mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-7 h-7 rounded-full transition-all",
                    color === c
                      ? "ring-2 ring-[var(--ac)] ring-offset-2 ring-offset-[var(--bg-1)] scale-110"
                      : "hover:scale-105"
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row">
          {isEdit && (
            <Button variant="destructive" onClick={handleDelete} className="mr-auto">
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {isEdit ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
