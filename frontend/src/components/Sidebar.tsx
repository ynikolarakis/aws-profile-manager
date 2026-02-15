import { useStore } from "@/store";
import { ProfileList } from "./ProfileList";
import { ResizeHandle } from "./ResizeHandle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, FolderPlus, Play } from "lucide-react";

export function Sidebar() {
  const search = useStore((s) => s.search);
  const setSearch = useStore((s) => s.setSearch);
  const setDialog = useStore((s) => s.setDialog);

  return (
    <div
      id="sidebar"
      className="bg-[var(--bg-1)] border-r border-[var(--border)] flex flex-col overflow-hidden relative"
    >
      {/* Search + actions */}
      <div className="px-2.5 pt-2 pb-1 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--t4)] pointer-events-none" />
          <Input
            type="text"
            placeholder="Search profiles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-7 text-[12px]"
          />
        </div>

        <div className="flex gap-1 pt-1.5 pb-0.5">
          <Button
            variant="ghost"
            size="sm"
            className="text-[11px] text-[var(--t3)] h-6 px-2 gap-1"
            onClick={() => setDialog({ type: "category-editor", data: {} })}
          >
            <FolderPlus className="w-3 h-3" />
            Category
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-[11px] text-[var(--t3)] h-6 px-2 gap-1"
            onClick={() => setDialog({ type: "bulk-run", data: {} })}
          >
            <Play className="w-3 h-3" />
            Bulk Run
          </Button>
        </div>
      </div>

      <ProfileList />
      <ResizeHandle />
    </div>
  );
}
