import { useStore } from "@/store";

export function FavoritesBar() {
  const favorites = useStore((s) => s.favorites);
  const runCommand = useStore((s) => s.runCommand);
  const removeFavorite = useStore((s) => s.removeFavorite);

  if (favorites.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 14px",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-1)",
        flexShrink: 0,
        overflowX: "auto",
      }}
    >
      {favorites.map((fav) => (
        <div
          key={fav.cmd}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            height: 24,
            padding: "0 8px",
            borderRadius: "var(--r)",
            border: "1px solid var(--border)",
            fontSize: 11,
            fontWeight: 500,
            whiteSpace: "nowrap",
            cursor: "pointer",
            transition: "all .1s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--border-h)";
            e.currentTarget.style.background = "var(--bg-2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.background = "none";
          }}
        >
          <span onClick={() => runCommand(fav.cmd)} style={{ color: "var(--t2)" }}>
            {fav.label}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeFavorite(fav.cmd);
            }}
            style={{
              fontSize: 10,
              color: "var(--t4)",
              padding: 0,
              lineHeight: 1,
            }}
          >
            x
          </button>
        </div>
      ))}
    </div>
  );
}
