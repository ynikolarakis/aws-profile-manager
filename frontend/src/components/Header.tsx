import { useStore } from "@/store";

export function Header() {
  const active = useStore((s) => s.active);
  const theme = useStore((s) => s.theme);
  const identity = useStore((s) => s.identity);
  const setTheme = useStore((s) => s.setTheme);
  const reload = useStore((s) => s.reload);
  const setDialog = useStore((s) => s.setDialog);

  const handleExport = async () => {
    const resp = await fetch("/api/export");
    const data = await resp.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aws-profiles-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        await fetch("/api/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        reload();
      } catch {
        // ignore parse errors
      }
    };
    input.click();
  };

  return (
    <header
      style={{
        gridColumn: "1 / -1",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0 12px",
        background: "var(--bg-1)",
        borderBottom: "1px solid var(--border)",
        zIndex: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="6" fill="#3b82f6" />
          <path
            d="M8 18.5C8 15.46 10.46 13 13.5 13H14C14 10.79 15.79 9 18 9C19.86 9 21.43 10.28 21.87 12.01C23.61 12.1 25 13.55 25 15.33C25 17.18 23.51 18.5 21.67 18.5H13.5C11.57 18.5 10 18.5 8 18.5Z"
            fill="white"
            fillOpacity={0.9}
          />
          <path d="M12 21L14.5 23.5L12 26" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="17" y1="26" x2="22" y2="26" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.03em" }}>
          AWS Profile Manager
        </span>
      </div>

      <div style={{ width: 1, height: 16, background: "var(--border)", flexShrink: 0 }} />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          height: 24,
          padding: "0 8px",
          borderRadius: "var(--r)",
          border: "1px solid var(--border)",
          fontSize: 11,
          fontWeight: 500,
        }}
      >
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: identity?.error ? "var(--amber)" : "var(--green)",
            boxShadow: `0 0 6px ${identity?.error ? "var(--amber)" : "var(--green)"}`,
          }}
        />
        <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--t2)" }}>
          {active || "none"}
        </span>
      </div>

      <div style={{ flex: 1 }} />

      <button
        onClick={() => reload()}
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "var(--t3)",
          height: 28,
          padding: "0 8px",
          borderRadius: "var(--r)",
          transition: "all .12s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--t1)";
          e.currentTarget.style.background = "var(--bg-3)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--t3)";
          e.currentTarget.style.background = "none";
        }}
      >
        Reload
      </button>

      <button
        onClick={handleImport}
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "var(--t3)",
          height: 28,
          padding: "0 8px",
          borderRadius: "var(--r)",
          transition: "all .12s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--t1)";
          e.currentTarget.style.background = "var(--bg-3)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--t3)";
          e.currentTarget.style.background = "none";
        }}
      >
        Import
      </button>

      <button
        onClick={handleExport}
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "var(--t3)",
          height: 28,
          padding: "0 8px",
          borderRadius: "var(--r)",
          transition: "all .12s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--t1)";
          e.currentTarget.style.background = "var(--bg-3)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--t3)";
          e.currentTarget.style.background = "none";
        }}
      >
        Export
      </button>

      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "var(--t3)",
          height: 28,
          padding: "0 8px",
          borderRadius: "var(--r)",
          transition: "all .12s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--t1)";
          e.currentTarget.style.background = "var(--bg-3)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--t3)";
          e.currentTarget.style.background = "none";
        }}
      >
        {theme === "dark" ? "Light" : "Dark"}
      </button>

      <button
        onClick={() => setDialog({ type: "profile-editor", data: {} })}
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "var(--ac)",
          height: 28,
          padding: "0 8px",
          borderRadius: "var(--r)",
          transition: "all .12s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--ac-dim)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "none";
        }}
      >
        + New Profile
      </button>
    </header>
  );
}
