import { useState, type MouseEvent } from "react";
import { useStore } from "@/store";
import { ContextMenu } from "./ContextMenu";

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
    { label: "View Details", action: () => setDetailProfile(name) },
    ...(profile.type === "sso"
      ? [{ label: "SSO Login", action: () => runCommand(`aws sso login --profile ${name}`) }]
      : []),
    {
      label: "Cost Explorer",
      action: () => setDialog({ type: "cost-explorer", data: { profile: name } }),
    },
    { separator: true as const },
    {
      label: "Edit",
      action: () => setDialog({ type: "profile-editor", data: { profile: name } }),
    },
    {
      label: "Delete",
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
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          height: 32,
          padding: "0 6px 0 20px",
          borderRadius: "var(--r)",
          cursor: "pointer",
          position: "relative",
          transition: "all .08s var(--ease)",
          background: isActive ? "var(--ac-dim)" : undefined,
        }}
        onMouseEnter={(e) => {
          if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,.035)";
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.background = "none";
        }}
      >
        {isActive && (
          <span
            style={{
              position: "absolute",
              left: 7,
              top: "50%",
              transform: "translateY(-50%)",
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: "var(--ac)",
              boxShadow: "0 0 6px var(--ac-glow)",
            }}
          />
        )}

        <span
          style={{
            width: 3,
            height: 16,
            borderRadius: 1,
            flexShrink: 0,
            opacity: 0.5,
            background: typeColors[profile.type] || "var(--t4)",
          }}
        />

        <span
          style={{
            flex: 1,
            fontSize: 12.5,
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {name}
        </span>

        {cost && (
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 9,
              color: "var(--t4)",
              fontWeight: 500,
              flexShrink: 0,
            }}
          >
            {cost}
          </span>
        )}

        <button
          onClick={handleMore}
          style={{
            width: 24,
            height: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "var(--r)",
            color: "var(--t4)",
            fontSize: 14,
            fontWeight: 700,
            flexShrink: 0,
            letterSpacing: 1,
          }}
        >
          ...
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
