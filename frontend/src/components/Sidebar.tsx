import { useStore } from "@/store";
import { ProfileList } from "./ProfileList";
import { ResizeHandle } from "./ResizeHandle";

export function Sidebar() {
  const search = useStore((s) => s.search);
  const setSearch = useStore((s) => s.setSearch);
  const setDialog = useStore((s) => s.setDialog);

  return (
    <div
      id="sidebar"
      style={{
        background: "var(--bg-1)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div style={{ padding: "8px 10px 4px", flexShrink: 0 }}>
        <div style={{ position: "relative" }}>
          <span
            style={{
              position: "absolute",
              left: 8,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--t4)",
              fontSize: 11,
              pointerEvents: "none",
            }}
          >
            &#x1F50D;
          </span>
          <input
            type="text"
            placeholder="Search profiles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              height: 28,
              padding: "0 8px 0 26px",
              background: "var(--bg-0)",
              border: "1px solid transparent",
              borderRadius: "var(--r)",
              color: "var(--t1)",
              fontSize: 12,
              outline: "none",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 2, padding: "6px 0 2px" }}>
          <button
            onClick={() => setDialog({ type: "category-editor", data: {} })}
            style={{
              fontSize: 11,
              color: "var(--t3)",
              padding: "2px 6px",
              borderRadius: "var(--r)",
            }}
          >
            + Category
          </button>
          <button
            onClick={() => setDialog({ type: "bulk-run", data: {} })}
            style={{
              fontSize: 11,
              color: "var(--t3)",
              padding: "2px 6px",
              borderRadius: "var(--r)",
            }}
          >
            Bulk Run
          </button>
        </div>
      </div>

      <ProfileList />
      <ResizeHandle />
    </div>
  );
}
