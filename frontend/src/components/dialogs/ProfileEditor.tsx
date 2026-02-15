import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/store";
import type { Profile } from "@/types";

interface Props {
  data: Record<string, unknown>;
  onClose: () => void;
}

const PROFILE_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

export function ProfileEditor({ data, onClose }: Props) {
  const profiles = useStore((s) => s.profiles);
  const categories = useStore((s) => s.categories);
  const profileCat = useStore((s) => s.profile_cat);
  const regions = useStore((s) => s.regions);
  const saveProfile = useStore((s) => s.saveProfile);

  const editName = data.profile as string | undefined;
  const existing = editName ? profiles[editName] : null;

  const [name, setName] = useState(existing?.name || "");
  const [type, setType] = useState<Profile["type"]>(existing?.type || "credentials");
  const [region, setRegion] = useState(existing?.region || "eu-central-1");
  const [output, setOutput] = useState(existing?.output || "json");
  const [catId, setCatId] = useState(editName ? profileCat[editName] || "__none__" : "__none__");

  // SSO fields
  const [ssoStartUrl, setSsoStartUrl] = useState(existing?.sso_start_url || "");
  const [ssoRegion, setSsoRegion] = useState(existing?.sso_region || "");
  const [ssoAccountId, setSsoAccountId] = useState(existing?.sso_account_id || "");
  const [ssoRoleName, setSsoRoleName] = useState(existing?.sso_role_name || "");

  // Credentials fields
  const [accessKeyId, setAccessKeyId] = useState(existing?.aws_access_key_id || "");
  const [secretKey, setSecretKey] = useState("");
  const [sessionToken, setSessionToken] = useState(existing?.aws_session_token || "");

  // Role fields
  const [roleArn, setRoleArn] = useState(existing?.role_arn || "");
  const [sourceProfile, setSourceProfile] = useState(existing?.source_profile || "");
  const [externalId, setExternalId] = useState(existing?.external_id || "");

  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!name) {
      setNameError(null);
    } else if (!PROFILE_NAME_RE.test(name)) {
      setNameError("Only letters, numbers, dots, hyphens, underscores.");
    } else {
      setNameError(null);
    }
  }, [name]);

  const handleSave = async () => {
    if (!name || nameError) return;
    setSaving(true);

    const payload: Record<string, unknown> = {
      name,
      type,
      region,
      output,
      _cat_id: catId,
    };

    if (editName) {
      payload._orig_name = editName;
    }

    if (type === "sso") {
      payload.sso_start_url = ssoStartUrl;
      payload.sso_region = ssoRegion;
      payload.sso_account_id = ssoAccountId;
      payload.sso_role_name = ssoRoleName;
    } else if (type === "credentials") {
      payload.aws_access_key_id = accessKeyId;
      if (secretKey) payload.aws_secret_access_key = secretKey;
      if (sessionToken) payload.aws_session_token = sessionToken;
    } else if (type === "role") {
      payload.role_arn = roleArn;
      payload.source_profile = sourceProfile;
      if (externalId) payload.external_id = externalId;
    }

    const result = await saveProfile(payload);
    setSaving(false);

    if (result.ok) {
      onClose();
    } else if (result.error) {
      setNameError(result.error);
    }
  };

  const inputStyle = {
    width: "100%",
    height: 32,
    padding: "0 10px",
    background: "var(--bg-0)",
    border: "1px solid var(--border)",
    borderRadius: "var(--r)",
    color: "var(--t1)",
    fontSize: 12,
    outline: "none",
  };

  const labelStyle = {
    fontSize: 11,
    fontWeight: 500 as const,
    color: "var(--t3)",
    marginBottom: 4,
    display: "block" as const,
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        style={{
          background: "var(--bg-1)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-lg)",
          padding: 24,
          width: 420,
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
          {editName ? "Edit Profile" : "New Profile"}
        </h2>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="my-profile"
            style={{
              ...inputStyle,
              borderColor: nameError ? "var(--red)" : "var(--border)",
            }}
          />
          {nameError && (
            <div style={{ fontSize: 11, color: "var(--red)", marginTop: 4 }}>{nameError}</div>
          )}
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Category</label>
          <select value={catId} onChange={(e) => setCatId(e.target.value)} style={inputStyle}>
            <option value="__none__">None</option>
            {Object.entries(categories).map(([id, cat]) => (
              <option key={id} value={id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Type</label>
          <div style={{ display: "flex", gap: 4 }}>
            {(["sso", "credentials", "role"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                style={{
                  flex: 1,
                  height: 30,
                  fontSize: 12,
                  fontWeight: 500,
                  borderRadius: "var(--r)",
                  border: `1px solid ${type === t ? "var(--ac)" : "var(--border)"}`,
                  background: type === t ? "var(--ac-dim)" : "var(--bg-0)",
                  color: type === t ? "var(--ac)" : "var(--t2)",
                  textTransform: "uppercase",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {type === "sso" && (
          <>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>SSO Start URL</label>
              <input value={ssoStartUrl} onChange={(e) => setSsoStartUrl(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>SSO Region</label>
              <input value={ssoRegion} onChange={(e) => setSsoRegion(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Account ID</label>
              <input value={ssoAccountId} onChange={(e) => setSsoAccountId(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Role Name</label>
              <input value={ssoRoleName} onChange={(e) => setSsoRoleName(e.target.value)} style={inputStyle} />
            </div>
          </>
        )}

        {type === "credentials" && (
          <>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Access Key ID</label>
              <input value={accessKeyId} onChange={(e) => setAccessKeyId(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Secret Access Key</label>
              <input
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder={existing?.has_keys ? "(unchanged)" : ""}
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Session Token (optional)</label>
              <input value={sessionToken} onChange={(e) => setSessionToken(e.target.value)} style={inputStyle} />
            </div>
          </>
        )}

        {type === "role" && (
          <>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Role ARN</label>
              <input value={roleArn} onChange={(e) => setRoleArn(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Source Profile</label>
              <select value={sourceProfile} onChange={(e) => setSourceProfile(e.target.value)} style={inputStyle}>
                <option value="">Select...</option>
                {Object.keys(profiles).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>External ID (optional)</label>
              <input value={externalId} onChange={(e) => setExternalId(e.target.value)} style={inputStyle} />
            </div>
          </>
        )}

        <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Region</label>
            <select value={region} onChange={(e) => setRegion(e.target.value)} style={inputStyle}>
              {regions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Output</label>
            <select value={output} onChange={(e) => setOutput(e.target.value)} style={inputStyle}>
              <option value="json">json</option>
              <option value="table">table</option>
              <option value="text">text</option>
              <option value="yaml">yaml</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
          <button
            onClick={onClose}
            style={{
              height: 32,
              padding: "0 16px",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--t2)",
              borderRadius: "var(--r)",
              border: "1px solid var(--border)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name || !!nameError || saving}
            style={{
              height: 32,
              padding: "0 16px",
              fontSize: 12,
              fontWeight: 500,
              color: "#fff",
              background: "var(--ac)",
              borderRadius: "var(--r)",
              opacity: !name || nameError || saving ? 0.5 : 1,
            }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
