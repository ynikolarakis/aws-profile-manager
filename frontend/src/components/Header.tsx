import { useStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Upload, Download, Sun, Moon, Plus, Search, Radar } from "lucide-react";

export function Header() {
  const active = useStore((s) => s.active);
  const theme = useStore((s) => s.theme);
  const identity = useStore((s) => s.identity);
  const setTheme = useStore((s) => s.setTheme);
  const reload = useStore((s) => s.reload);
  const setDialog = useStore((s) => s.setDialog);
  const setCommandPaletteOpen = useStore((s) => s.setCommandPaletteOpen);

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
    <TooltipProvider delayDuration={300}>
      <header className="col-span-full flex items-center gap-2.5 px-3 bg-[var(--bg-1)] border-b border-[var(--border)] z-20">
        {/* Logo */}
        <div className="flex items-center gap-1.5">
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
          <span className="text-[13px] font-bold tracking-tight">AWS Profile Manager</span>
        </div>

        <Separator orientation="vertical" className="h-4 mx-0.5" />

        {/* Active profile chip */}
        <div className="flex items-center gap-1.5 h-6 px-2 rounded-md border border-[var(--border)] text-[11px] font-medium">
          <span
            className="w-[5px] h-[5px] rounded-full shrink-0"
            style={{
              background: identity?.error ? "var(--amber)" : "var(--green)",
              boxShadow: `0 0 6px ${identity?.error ? "var(--amber)" : "var(--green)"}`,
            }}
          />
          <span className="font-mono text-[11px] text-[var(--t2)]">
            {active || "none"}
          </span>
        </div>

        {/* Command palette trigger */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="hidden sm:flex items-center gap-2 h-7 px-3 ml-1 rounded-md border border-[var(--border)] text-[var(--t4)] text-[11px] hover:border-[var(--border-h)] hover:text-[var(--t3)] transition-colors cursor-pointer"
        >
          <Search className="w-3 h-3" />
          <span>Search or jump to...</span>
          <kbd className="ml-1">Ctrl+K</kbd>
        </button>

        <div className="flex-1" />

        {/* Action buttons */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => reload()}>
              <RefreshCw className="w-3.5 h-3.5 text-[var(--t3)]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reload profiles</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handleImport}>
              <Upload className="w-3.5 h-3.5 text-[var(--t3)]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Import profiles</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => setDialog({ type: "sso-discover", data: {} })}>
              <Radar className="w-3.5 h-3.5 text-[var(--t3)]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Discover SSO accounts</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handleExport}>
              <Download className="w-3.5 h-3.5 text-[var(--t3)]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Export profiles</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? (
                <Sun className="w-3.5 h-3.5 text-[var(--t3)]" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-[var(--t3)]" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{theme === "dark" ? "Light mode" : "Dark mode"}</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-4 mx-0.5" />

        <Button
          size="sm"
          onClick={() => setDialog({ type: "profile-editor", data: {} })}
          className="gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Profile</span>
        </Button>
      </header>
    </TooltipProvider>
  );
}
