import { useMemo } from "react";
import { useStore } from "@/store";
import { ProfileItem } from "./ProfileItem";

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
    <div style={{ flex: 1, overflowY: "auto", padding: "2px 6px 10px" }}>
      {sortedCatIds.map((cid) => {
        const cat = categories[cid];
        const items = categorized[cid] || [];
        const isCollapsed = collapsed[cid];

        return (
          <div key={cid} style={{ marginBottom: 2 }}>
            <div
              onClick={() => toggleCollapsed(cid)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                height: 26,
                padding: "0 6px",
                cursor: "pointer",
                borderRadius: "var(--r)",
                userSelect: "none",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,.03)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "none";
              }}
            >
              <span
                style={{
                  fontSize: 7,
                  color: "var(--t4)",
                  width: 10,
                  textAlign: "center",
                  transition: "transform .12s",
                  transform: isCollapsed ? "rotate(0deg)" : "rotate(90deg)",
                  display: "inline-block",
                }}
              >
                &#9654;
              </span>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 2,
                  background: cat.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  flex: 1,
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--t3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {cat.name}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontFamily: "var(--mono)",
                  color: "var(--t4)",
                }}
              >
                {items.length}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDialog({ type: "category-editor", data: { cid, name: cat.name, color: cat.color } });
                }}
                style={{
                  fontSize: 10,
                  color: "var(--t4)",
                  padding: "0 4px",
                  display: "none",
                }}
              >
                ...
              </button>
            </div>

            {!isCollapsed &&
              items.map((name) => <ProfileItem key={name} name={name} />)}
          </div>
        );
      })}

      {uncategorized.length > 0 && (
        <div>
          {sortedCatIds.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                height: 26,
                padding: "0 6px",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--t4)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
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
