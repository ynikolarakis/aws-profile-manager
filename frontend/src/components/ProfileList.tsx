import { useMemo } from "react";
import { useStore } from "@/store";
import { ProfileItem } from "./ProfileItem";
import { ChevronRight, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function ProfileList() {
  const profiles = useStore((s) => s.profiles);
  const categories = useStore((s) => s.categories);
  const profileCat = useStore((s) => s.profile_cat);
  const collapsed = useStore((s) => s.collapsed);
  const search = useStore((s) => s.search);
  const toggleCollapsed = useStore((s) => s.toggleCollapsed);
  const setDialog = useStore((s) => s.setDialog);

  const { categorized, uncategorized } = useMemo(() => {
    const profileNames = Object.keys(profiles);
    const lowerSearch = search.toLowerCase();

    const filtered = profileNames.filter((name) => {
      if (!search) return true;
      const p = profiles[name];
      return (
        name.toLowerCase().includes(lowerSearch) ||
        p.type.toLowerCase().includes(lowerSearch) ||
        p.region.toLowerCase().includes(lowerSearch) ||
        (p.sso_account_id || "").toLowerCase().includes(lowerSearch)
      );
    });

    const catProfiles: Record<string, string[]> = {};
    const uncat: string[] = [];

    for (const name of filtered) {
      const cid = profileCat[name];
      if (cid && categories[cid]) {
        (catProfiles[cid] ??= []).push(name);
      } else {
        uncat.push(name);
      }
    }

    return { categorized: catProfiles, uncategorized: uncat };
  }, [profiles, categories, profileCat, search]);

  const sortedCatIds = Object.entries(categories)
    .sort(([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0))
    .map(([id]) => id);

  return (
    <div className="flex-1 overflow-y-auto px-1.5 pb-2.5">
      {sortedCatIds.map((cid) => {
        const cat = categories[cid];
        const items = categorized[cid] || [];
        const isCollapsed = collapsed[cid];

        return (
          <div key={cid} className="mb-0.5">
            {/* Category header */}
            <div
              onClick={() => toggleCollapsed(cid)}
              className="group flex items-center gap-1 h-7 px-1.5 cursor-pointer rounded-md select-none hover:bg-[var(--bg-2)]/50 transition-colors"
            >
              <ChevronRight
                className={cn(
                  "w-3 h-3 text-[var(--t4)] shrink-0 transition-transform duration-150",
                  !isCollapsed && "rotate-90"
                )}
              />
              <span
                className="w-1.5 h-1.5 rounded-sm shrink-0"
                style={{ background: cat.color }}
              />
              <span className="flex-1 text-[11px] font-semibold text-[var(--t3)] uppercase tracking-wider">
                {cat.name}
              </span>
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 font-mono">
                {items.length}
              </Badge>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDialog({ type: "category-editor", data: { cid, name: cat.name, color: cat.color } });
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-[var(--bg-3)] text-[var(--t4)]"
              >
                <Settings className="w-3 h-3" />
              </button>
            </div>

            {/* Category items */}
            {!isCollapsed && items.map((name) => (
              <ProfileItem key={name} name={name} />
            ))}
          </div>
        );
      })}

      {uncategorized.length > 0 && (
        <div>
          {sortedCatIds.length > 0 && (
            <div className="flex items-center gap-1 h-7 px-1.5">
              <span className="text-[11px] font-semibold text-[var(--t4)] uppercase tracking-wider">
                Uncategorized
              </span>
            </div>
          )}
          {uncategorized.map((name) => (
            <ProfileItem key={name} name={name} />
          ))}
        </div>
      )}
    </div>
  );
}
