import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/store";

export function DetailSheet() {
  const detailProfile = useStore((s) => s.detailProfile);
  const profiles = useStore((s) => s.profiles);
  const categories = useStore((s) => s.categories);
  const profileCat = useStore((s) => s.profile_cat);
  const servicesMap = useStore((s) => s.services_map);
  const setDetailProfile = useStore((s) => s.setDetailProfile);
  const setProfileCategory = useStore((s) => s.setProfileCategory);
  const runCommand = useStore((s) => s.runCommand);
  const addFavorite = useStore((s) => s.addFavorite);
  const discoverServices = useStore((s) => s.discoverServices);

  const [services, setServices] = useState<Array<{ name: string; cost: number | null }>>([]);
  const [expandedSvc, setExpandedSvc] = useState<string | null>(null);

  const profile = detailProfile ? profiles[detailProfile] : null;

  useEffect(() => {
    if (detailProfile) {
      discoverServices(detailProfile);
    }
  }, [detailProfile, discoverServices]);

  // Listen for services SSE event
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.profile === detailProfile) {
        setServices(customEvent.detail.svcs || []);
      }
    };
    window.addEventListener("aws-services", handler);
    return () => window.removeEventListener("aws-services", handler);
  }, [detailProfile]);

  // Also listen via store SSE
  useEffect(() => {
    const unsub = useStore.subscribe((state, prev) => {
      // Services updates come through SSE
      if (state !== prev) {
        // No-op, just trigger re-render
      }
    });
    return unsub;
  }, []);

  if (!detailProfile || !profile) return null;

  const typeColors: Record<string, string> = {
    sso: "var(--green)",
    credentials: "var(--violet)",
    role: "var(--amber)",
  };

  const details = [
    { label: "Type", value: profile.type },
    { label: "Region", value: profile.region },
    { label: "Output", value: profile.output },
    ...(profile.type === "sso"
      ? [
          { label: "SSO URL", value: profile.sso_start_url || "" },
          { label: "Account", value: profile.sso_account_id || "" },
          { label: "Role", value: profile.sso_role_name || "" },
        ]
      : []),
    ...(profile.type === "role"
      ? [
          { label: "Role ARN", value: profile.role_arn || "" },
          { label: "Source", value: profile.source_profile || "" },
        ]
      : []),
    ...(profile.type === "credentials" && profile.has_keys
      ? [{ label: "Keys", value: "Configured" }]
      : []),
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,.3)",
          zIndex: 50,
        }}
        onClick={() => setDetailProfile(null)}
      />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 380,
          background: "var(--bg-1)",
          borderLeft: "1px solid var(--border)",
          zIndex: 51,
          overflowY: "auto",
          padding: 24,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>{detailProfile}</h2>
          <button
            onClick={() => setDetailProfile(null)}
            style={{ fontSize: 16, color: "var(--t3)" }}
          >
            &#x2715;
          </button>
        </div>

        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "var(--r-lg)",
            background: typeColors[profile.type] || "var(--t4)",
            opacity: 0.15,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        />

        <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "8px 12px", marginBottom: 20 }}>
          {details.map((d) => (
            <div key={d.label} style={{ display: "contents" }}>
              <span style={{ fontSize: 11, color: "var(--t3)" }}>{d.label}</span>
              <span style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--t1)", wordBreak: "break-all" }}>
                {d.value}
              </span>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 500, color: "var(--t3)", marginBottom: 4, display: "block" }}>
            Category
          </label>
          <select
            value={profileCat[detailProfile] || "__none__"}
            onChange={(e) => setProfileCategory(detailProfile, e.target.value)}
            style={{
              width: "100%",
              height: 32,
              padding: "0 10px",
              background: "var(--bg-0)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r)",
              color: "var(--t1)",
              fontSize: 12,
              outline: "none",
            }}
          >
            <option value="__none__">None</option>
            {Object.entries(categories).map(([id, cat]) => (
              <option key={id} value={id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <h3 style={{ fontSize: 12, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
          Services
        </h3>

        {(services.length > 0 ? services : Object.keys(servicesMap).slice(0, 6).map((n) => ({ name: n, cost: null }))).map((svc) => {
          const svcDef = servicesMap[svc.name];
          if (!svcDef) return null;

          const isExpanded = expandedSvc === svc.name;

          return (
            <div key={svc.name} style={{ marginBottom: 4 }}>
              <button
                onClick={() => setExpandedSvc(isExpanded ? null : svc.name)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "6px 8px",
                  borderRadius: "var(--r)",
                  textAlign: "left",
                  transition: "background .08s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-2)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
              >
                <span style={{ fontSize: 14 }}>{svcDef.icon}</span>
                <span style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>{svcDef.short}</span>
                {svc.cost !== null && (
                  <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--t3)" }}>
                    ${svc.cost.toFixed(2)}
                  </span>
                )}
              </button>

              {isExpanded && (
                <div style={{ paddingLeft: 28, paddingBottom: 4 }}>
                  {svcDef.cmds.map((cmd) => (
                    <div
                      key={cmd[0]}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "3px 0",
                      }}
                    >
                      <button
                        onClick={() => runCommand(cmd[1])}
                        style={{
                          fontSize: 11,
                          color: "var(--ac)",
                          textAlign: "left",
                        }}
                      >
                        {cmd[0]}
                      </button>
                      <button
                        onClick={() => addFavorite(cmd[0], cmd[1])}
                        style={{ fontSize: 10, color: "var(--t4)", marginLeft: "auto" }}
                      >
                        &#9733;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </motion.div>
    </AnimatePresence>
  );
}
