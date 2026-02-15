import { useStore } from "@/store";

export function IdentityBar() {
  const identity = useStore((s) => s.identity);

  const hasError = identity?.error;
  const dotColor = hasError ? "var(--amber)" : "var(--green)";
  const text = hasError
    ? identity.error
    : identity
      ? `${identity.account} · ${identity.arn}`
      : "Checking identity...";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 14px",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-1)",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: dotColor,
          boxShadow: `0 0 6px ${dotColor}`,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: 11,
          fontFamily: "var(--mono)",
          color: hasError ? "var(--amber)" : "var(--t2)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </span>
    </div>
  );
}
