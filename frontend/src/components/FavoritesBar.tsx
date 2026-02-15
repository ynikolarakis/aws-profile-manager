import { useStore } from "@/store";
import { Badge } from "@/components/ui/badge";
import { Star, X } from "lucide-react";

export function FavoritesBar() {
  const favorites = useStore((s) => s.favorites);
  const runCommand = useStore((s) => s.runCommand);
  const removeFavorite = useStore((s) => s.removeFavorite);

  if (favorites.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 px-3.5 py-1 border-b border-[var(--border)] bg-[var(--bg-1)] shrink-0 overflow-x-auto">
      {favorites.map((fav) => (
        <Badge
          key={fav.cmd}
          variant="outline"
          className="shrink-0 gap-1 cursor-pointer hover:bg-[var(--bg-2)] transition-colors group"
        >
          <Star className="w-2.5 h-2.5 text-[var(--amber)] opacity-60" />
          <span onClick={() => runCommand(fav.cmd)} className="text-[var(--t2)]">
            {fav.label}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeFavorite(fav.cmd);
            }}
            className="text-[var(--t4)] hover:text-[var(--red)] transition-colors opacity-0 group-hover:opacity-100 -mr-0.5"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </Badge>
      ))}
    </div>
  );
}
