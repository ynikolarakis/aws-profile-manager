import { useStore } from "@/store";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from "@/components/ui/command";
import {
  User,
  RefreshCw,
  Upload,
  Download,
  Sun,
  Moon,
  Plus,
  Terminal,
  List,
  Star,
  Radar,
  Network,
  Settings,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const typeVariant: Record<string, "success" | "warning" | "outline"> = {
  sso: "success",
  credentials: "outline",
  role: "warning",
};

export function CommandPalette() {
  const open = useStore((s) => s.commandPaletteOpen);
  const setOpen = useStore((s) => s.setCommandPaletteOpen);
  const profiles = useStore((s) => s.profiles);
  const theme = useStore((s) => s.theme);
  const activate = useStore((s) => s.activate);
  const setDialog = useStore((s) => s.setDialog);
  const setTheme = useStore((s) => s.setTheme);
  const reload = useStore((s) => s.reload);
  const runCommand = useStore((s) => s.runCommand);
  const toggleAiMode = useStore((s) => s.toggleAiMode);

  const handleSelect = (cb: () => void) => {
    setOpen(false);
    cb();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search profiles, actions, commands..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Switch Profile */}
        <CommandGroup heading="Switch Profile">
          {Object.entries(profiles).map(([name, profile]) => (
            <CommandItem
              key={name}
              onSelect={() => handleSelect(() => activate(name))}
            >
              <User className="text-[var(--t3)]" />
              <span className="flex-1">{name}</span>
              <Badge variant={typeVariant[profile.type] || "outline"} className="ml-auto">
                {profile.type}
              </Badge>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Actions */}
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => handleSelect(() => setDialog({ type: "profile-editor", data: {} }))}>
            <Plus className="text-[var(--t3)]" />
            <span>New Profile</span>
            <CommandShortcut>Ctrl+N</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => reload())}>
            <RefreshCw className="text-[var(--t3)]" />
            <span>Reload Profiles</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => {
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
              } catch { /* ignore */ }
            };
            input.click();
          })}>
            <Upload className="text-[var(--t3)]" />
            <span>Import Profiles</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(async () => {
            const resp = await fetch("/api/export");
            const data = await resp.json();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `aws-profiles-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
          })}>
            <Download className="text-[var(--t3)]" />
            <span>Export Profiles</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => setTheme(theme === "dark" ? "light" : "dark"))}>
            {theme === "dark" ? <Sun className="text-[var(--t3)]" /> : <Moon className="text-[var(--t3)]" />}
            <span>{theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => setDialog({ type: "favorite-editor", data: {} }))}>
            <Star className="text-[var(--t3)]" />
            <span>Add Favorite Command</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => setDialog({ type: "infra-diagram", data: {} }))}>
            <Network className="text-[var(--t3)]" />
            <span>Architecture Diagram</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => setDialog({ type: "sso-discover", data: {} }))}>
            <Radar className="text-[var(--t3)]" />
            <span>Discover SSO Accounts</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => setDialog({ type: "settings", data: {} }))}>
            <Settings className="text-[var(--t3)]" />
            <span>Settings</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => toggleAiMode())}>
            <Sparkles className="text-[var(--t3)]" />
            <span>Toggle AI Mode</span>
            <CommandShortcut>Ctrl+I</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Quick Commands */}
        <CommandGroup heading="Quick Commands">
          <CommandItem onSelect={() => handleSelect(() => runCommand("aws sts get-caller-identity"))}>
            <Terminal className="text-[var(--t3)]" />
            <span>STS Get Caller Identity</span>
            <CommandShortcut>Ctrl+/</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => runCommand("aws s3 ls"))}>
            <List className="text-[var(--t3)]" />
            <span>S3 List Buckets</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
