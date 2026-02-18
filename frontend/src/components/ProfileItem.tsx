import { useState, type MouseEvent } from "react";
import { useStore } from "@/store";
import { ContextMenu } from "./ContextMenu";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  name: string;
}

const typeColors: Record<string, string> = {
  sso: "var(--green)",
  credentials: "var(--violet)",
  role: "var(--amber)",
};

export function ProfileItem({ name }: Props) {
  const profile = useStore((s) => s.profiles[name]);
  const active = useStore((s) => s.active);
  const costBadges = useStore((s) => s.costBadges);
  const activate = useStore((s) => s.activate);
  const setDetailProfile = useStore((s) => s.setDetailProfile);
  const setDialog = useStore((s) => s.setDialog);
  const deleteProfile = useStore((s) => s.deleteProfile);
  const runCommand = useStore((s) => s.runCommand);

  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);

  if (!profile) return null;

  const isActive = name === active;
  const cost = costBadges[name];

  const handleClick = () => activate(name);

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  };

  const handleMore = (e: MouseEvent) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setCtxMenu({ x: rect.right, y: rect.top });
  };

  const menuItems = [
    { label: "View Details", icon: "eye", action: () => setDetailProfile(name) },
    ...(profile.type === "sso"
      ? [
          { label: "SSO Login", icon: "log-in", action: () => runCommand(`aws sso login --profile ${name}`) },
          {
            label: "Discover Accounts",
            icon: "radar",
            action: () => setDialog({ type: "sso-discover", data: { sso_start_url: profile.sso_start_url } }),
          },
        ]
      : []),
    {
      label: "Cost Explorer",
      icon: "dollar-sign",
      action: () => setDialog({ type: "cost-explorer", data: { profile: name } }),
    },
    {
      label: "Architecture Diagram",
      icon: "network",
      action: () => setDialog({ type: "infra-diagram", data: { profile: name } }),
    },
    { separator: true as const },
    {
      label: "Edit",
      icon: "pencil",
      action: () => setDialog({ type: "profile-editor", data: { profile: name } }),
    },
    {
      label: "Delete",
      icon: "trash-2",
      danger: true,
      action: () => {
        if (window.confirm(`Delete profile "${name}"?`)) {
          deleteProfile(name);
        }
      },
    },
  ];

  return (
    <>
      <div
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        className={cn(
          "group flex items-center gap-1.5 h-8 pl-4 pr-1.5 rounded-md cursor-pointer relative transition-all duration-75",
          isActive
            ? "bg-[var(--ac-dim)] border-l-2 border-l-[var(--ac)] pl-[14px]"
            : "hover:bg-[var(--bg-2)]/50"
        )}
      >
        {/* Type indicator dot */}
        <span
          className="w-[6px] h-[6px] rounded-full shrink-0"
          style={{
            background: typeColors[profile.type] || "var(--t4)",
            opacity: isActive ? 1 : 0.6,
          }}
        />

        {/* Profile info */}
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] font-medium truncate">{name}</div>
          <div className="text-[10px] text-[var(--t3)] truncate leading-tight -mt-0.5">
            {profile.region} · {profile.type}
          </div>
        </div>

        {/* Cost badge */}
        {cost && (
          <span className="font-mono text-[9px] text-[var(--t4)] font-medium shrink-0">
            {cost}
          </span>
        )}

        {/* More button */}
        <button
          onClick={handleMore}
          className="w-6 h-6 flex items-center justify-center rounded-md text-[var(--t4)] opacity-0 group-hover:opacity-100 hover:bg-[var(--bg-3)] transition-all shrink-0"
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={menuItems}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </>
  );
}
