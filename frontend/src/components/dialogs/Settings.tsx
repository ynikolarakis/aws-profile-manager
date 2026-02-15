import { useState, useEffect } from "react";
import { useStore } from "@/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LlmProviderType, LlmProviderConfig } from "@/types";

interface Props {
  onClose: () => void;
}

const COMMON_ENCODINGS = [
  { label: "UTF-8", value: "utf-8" },
  { label: "CP437", value: "cp437" },
  { label: "CP850", value: "cp850" },
  { label: "CP1252", value: "cp1252" },
  { label: "CP1253", value: "cp1253" },
  { label: "CP737", value: "cp737" },
  { label: "Latin-1", value: "latin-1" },
];

const PROVIDER_LABELS: Record<LlmProviderType, string> = {
  bedrock: "AWS Bedrock",
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google AI",
  openrouter: "OpenRouter",
  ollama: "Ollama",
};

const PROVIDER_MODELS: Partial<Record<LlmProviderType, string[]>> = {
  anthropic: [
    "claude-opus-4-6",
    "claude-sonnet-4-5-20250929",
    "claude-haiku-4-5-20251001",
    "claude-sonnet-4-20250514",
    "claude-opus-4-5-20251101",
  ],
  openai: [
    "gpt-4o-mini",
    "gpt-4o",
    "gpt-4.1",
    "gpt-4.1-mini",
    "o4-mini",
    "o3",
    "o3-mini",
  ],
  google: [
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-3-pro-preview",
    "gemini-3-flash-preview",
  ],
  bedrock: [
    "anthropic.claude-opus-4-6-v1",
    "anthropic.claude-sonnet-4-5-20250929-v1:0",
    "anthropic.claude-haiku-4-5-20251001-v1:0",
    "anthropic.claude-sonnet-4-20250514-v1:0",
    "anthropic.claude-opus-4-5-20251101-v1:0",
    "anthropic.claude-3-haiku-20240307-v1:0",
  ],
};

const ALL_PROVIDERS: LlmProviderType[] = ["bedrock", "anthropic", "openai", "google", "openrouter", "ollama"];

export function Settings({ onClose }: Props) {
  const dialog = useStore((s) => s.dialog);
  const terminalEncoding = useStore((s) => s.terminal_encoding);
  const defaultEncoding = useStore((s) => s.default_encoding);
  const setEncoding = useStore((s) => s.setEncoding);
  const profiles = useStore((s) => s.profiles);
  const loadLlmConfig = useStore((s) => s.loadLlmConfig);
  const saveLlmConfig = useStore((s) => s.saveLlmConfig);

  const initialTab = (dialog.data?.tab === "ai") ? "ai" : "general";
  const [tab, setTab] = useState<"general" | "ai">(initialTab);

  // General tab state
  const [encoding, setEncodingValue] = useState(terminalEncoding);
  const [encError, setEncError] = useState<string | null>(null);
  const [encSaved, setEncSaved] = useState(false);

  // AI tab state
  const [providerConfigs, setProviderConfigs] = useState<Partial<Record<LlmProviderType, LlmProviderConfig>>>({});
  const [defaultProvider, setDefaultProvider] = useState<string | null>(null);
  const [expandedProvider, setExpandedProvider] = useState<LlmProviderType | null>(null);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiSaved, setAiSaved] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [testing, setTesting] = useState<LlmProviderType | null>(null);
  const [testResult, setTestResult] = useState<{ ok: boolean; response?: string; error?: string } | null>(null);

  useEffect(() => {
    loadLlmConfig().then(() => {
      const config = useStore.getState().llmConfig;
      if (config) {
        setProviderConfigs(config.providers || {});
        setDefaultProvider(config.default_provider);
      }
    });
  }, [loadLlmConfig]);

  const handleEncSave = async () => {
    setEncError(null);
    const result = await setEncoding(encoding);
    if (result.error) {
      setEncError(result.error);
    } else {
      setEncSaved(true);
      setTimeout(() => setEncSaved(false), 2000);
    }
  };

  const updateProviderConfig = (ptype: LlmProviderType, updates: Partial<LlmProviderConfig>) => {
    setProviderConfigs((prev) => ({
      ...prev,
      [ptype]: { ...(prev[ptype] || {}), ...updates },
    }));
    setAiSaved(false);
  };

  const handleAiSave = async () => {
    setAiSaving(true);
    setAiError(null);

    // Build save payload — use __keep__ for unchanged API keys
    const llmConfig = useStore.getState().llmConfig;
    const saveProviders: Record<string, LlmProviderConfig> = {};
    for (const [ptype, cfg] of Object.entries(providerConfigs)) {
      const entry = { ...cfg };
      // If the key is still the masked value, send __keep__
      if (entry.api_key === "••••••••" && llmConfig?.providers[ptype as LlmProviderType]?.has_api_key) {
        entry.api_key = "__keep__";
      }
      // Ensure model has a default if not explicitly set
      if (!entry.model && PROVIDER_MODELS[ptype as LlmProviderType]?.[0]) {
        entry.model = PROVIDER_MODELS[ptype as LlmProviderType]![0];
      }
      saveProviders[ptype] = entry;
    }

    const result = await saveLlmConfig({ providers: saveProviders, default_provider: defaultProvider });
    setAiSaving(false);
    if (result.error) {
      setAiError(result.error);
    } else {
      setAiSaved(true);
      // Reload config so masked keys and has_api_key flags are fresh
      await loadLlmConfig();
      const fresh = useStore.getState().llmConfig;
      if (fresh) {
        setProviderConfigs(fresh.providers || {});
      }
      setTimeout(() => setAiSaved(false), 2000);
    }
  };

  const handleTest = async (ptype: LlmProviderType) => {
    const cfg = providerConfigs[ptype] || {};
    const llmConfig = useStore.getState().llmConfig;
    const testCfg = { ...cfg };
    // Send __keep__ so backend resolves the real key from stored config
    if (testCfg.api_key === "••••••••" && llmConfig?.providers[ptype]?.has_api_key) {
      testCfg.api_key = "__keep__";
    }
    setTesting(ptype);
    setTestResult(null);
    try {
      await useStore.getState().testLlmProvider(ptype, testCfg);
      setTestResult(useStore.getState().aiTestResult);
    } catch {
      setTestResult({ ok: false, error: "Connection failed" });
    }
    setTesting(null);
  };

  const configuredProviders = ALL_PROVIDERS.filter((p) => {
    const cfg = providerConfigs[p];
    if (!cfg) return false;
    if (p === "bedrock") return !!cfg.bedrock_profile;
    if (p === "ollama") return !!cfg.base_url || !!cfg.model;
    return !!cfg.api_key || !!cfg.has_api_key;
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[520px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Configure application preferences</DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[var(--border)] -mx-6 px-6">
          <button
            className={cn(
              "px-3 py-1.5 text-[12px] font-medium border-b-2 -mb-px transition-colors",
              tab === "general"
                ? "border-[var(--ac)] text-[var(--t1)]"
                : "border-transparent text-[var(--t3)] hover:text-[var(--t2)]"
            )}
            onClick={() => setTab("general")}
          >
            General
          </button>
          <button
            className={cn(
              "px-3 py-1.5 text-[12px] font-medium border-b-2 -mb-px transition-colors",
              tab === "ai"
                ? "border-[var(--ac)] text-[var(--t1)]"
                : "border-transparent text-[var(--t3)] hover:text-[var(--t2)]"
            )}
            onClick={() => setTab("ai")}
          >
            AI Providers
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {tab === "general" && (
            <div>
              <label className="block text-[11px] font-medium text-[var(--t3)] mb-1.5">
                Terminal Output Encoding
              </label>
              <p className="text-[10px] text-[var(--t4)] mb-2">
                Controls how command output bytes are decoded. System default: <code className="font-mono text-[var(--ac)]">{defaultEncoding}</code>
              </p>
              <Input
                value={encoding}
                onChange={(e) => {
                  setEncodingValue(e.target.value);
                  setEncError(null);
                  setEncSaved(false);
                }}
                placeholder={defaultEncoding}
                className="font-mono"
              />
              {encError && (
                <p className="text-[11px] text-[var(--red)] mt-1">{encError}</p>
              )}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {COMMON_ENCODINGS.map((enc) => (
                  <Badge
                    key={enc.value}
                    variant={encoding === enc.value ? "default" : "outline"}
                    className="cursor-pointer hover:bg-[var(--bg-2)] transition-colors text-[10px]"
                    onClick={() => {
                      setEncodingValue(enc.value);
                      setEncError(null);
                      setEncSaved(false);
                    }}
                  >
                    {enc.label}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {tab === "ai" && (
            <div className="space-y-3">
              {/* Default provider */}
              <div>
                <label className="block text-[11px] font-medium text-[var(--t3)] mb-1.5">
                  Default Provider
                </label>
                <select
                  value={defaultProvider || ""}
                  onChange={(e) => { setDefaultProvider(e.target.value || null); setAiSaved(false); }}
                  className="w-full h-9 rounded-md border border-[var(--border)] bg-[var(--bg-1)] text-[var(--t1)] text-[12px] px-2"
                >
                  <option value="">Select a provider...</option>
                  {configuredProviders.map((p) => (
                    <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
                  ))}
                </select>
              </div>

              {/* Provider cards */}
              {ALL_PROVIDERS.map((ptype) => {
                const isExpanded = expandedProvider === ptype;
                const cfg = providerConfigs[ptype] || {};
                const isConfigured = configuredProviders.includes(ptype);

                return (
                  <div key={ptype} className="border border-[var(--border)] rounded-md overflow-hidden">
                    <button
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--bg-2)] transition-colors"
                      onClick={() => setExpandedProvider(isExpanded ? null : ptype)}
                    >
                      <span className="text-[12px] font-medium text-[var(--t1)] flex-1">
                        {PROVIDER_LABELS[ptype]}
                      </span>
                      {isConfigured && (
                        <Badge variant="default" className="text-[9px] h-4">configured</Badge>
                      )}
                      <span className="text-[var(--t4)] text-[10px]">{isExpanded ? "▼" : "▶"}</span>
                    </button>

                    {isExpanded && (
                      <div className="px-3 pb-3 space-y-2 border-t border-[var(--border)]">
                        {ptype === "bedrock" && (
                          <>
                            <div className="pt-2">
                              <label className="block text-[10px] text-[var(--t3)] mb-1">
                                Billing Profile <span className="text-[var(--t4)]">(your account, not customer)</span>
                              </label>
                              <select
                                value={cfg.bedrock_profile || ""}
                                onChange={(e) => updateProviderConfig(ptype, { bedrock_profile: e.target.value })}
                                className="w-full h-8 rounded border border-[var(--border)] bg-[var(--bg-1)] text-[var(--t1)] text-[11px] px-2"
                              >
                                <option value="">Select profile...</option>
                                {Object.keys(profiles).map((name) => (
                                  <option key={name} value={name}>{name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] text-[var(--t3)] mb-1">Region</label>
                              <select
                                value={cfg.bedrock_region || "us-east-1"}
                                onChange={(e) => updateProviderConfig(ptype, { bedrock_region: e.target.value })}
                                className="w-full h-8 rounded border border-[var(--border)] bg-[var(--bg-1)] text-[var(--t1)] text-[11px] px-2"
                              >
                                {["us-east-1", "us-west-2", "eu-central-1", "eu-west-1", "ap-northeast-1", "ap-southeast-1"].map((r) => (
                                  <option key={r} value={r}>{r}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] text-[var(--t3)] mb-1">Model</label>
                              <select
                                value={cfg.model || PROVIDER_MODELS.bedrock?.[0] || ""}
                                onChange={(e) => updateProviderConfig(ptype, { model: e.target.value })}
                                className="w-full h-8 rounded border border-[var(--border)] bg-[var(--bg-1)] text-[var(--t1)] text-[11px] px-2"
                              >
                                {(PROVIDER_MODELS.bedrock || []).map((m) => (
                                  <option key={m} value={m}>{m}</option>
                                ))}
                              </select>
                            </div>
                          </>
                        )}

                        {(ptype === "anthropic" || ptype === "openai" || ptype === "google" || ptype === "openrouter") && (
                          <>
                            <div className="pt-2">
                              <label className="block text-[10px] text-[var(--t3)] mb-1">API Key</label>
                              <Input
                                type="password"
                                value={cfg.api_key || ""}
                                onChange={(e) => updateProviderConfig(ptype, { api_key: e.target.value })}
                                placeholder="Enter API key..."
                                className="h-8 text-[11px] font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-[var(--t3)] mb-1">Model</label>
                              {PROVIDER_MODELS[ptype] ? (
                                <select
                                  value={cfg.model || PROVIDER_MODELS[ptype]?.[0] || ""}
                                  onChange={(e) => updateProviderConfig(ptype, { model: e.target.value })}
                                  className="w-full h-8 rounded border border-[var(--border)] bg-[var(--bg-1)] text-[var(--t1)] text-[11px] px-2"
                                >
                                  {(PROVIDER_MODELS[ptype] || []).map((m) => (
                                    <option key={m} value={m}>{m}</option>
                                  ))}
                                </select>
                              ) : (
                                <Input
                                  value={cfg.model || ""}
                                  onChange={(e) => updateProviderConfig(ptype, { model: e.target.value })}
                                  placeholder="Model name..."
                                  className="h-8 text-[11px] font-mono"
                                />
                              )}
                            </div>
                          </>
                        )}

                        {ptype === "ollama" && (
                          <>
                            <div className="pt-2">
                              <label className="block text-[10px] text-[var(--t3)] mb-1">Base URL</label>
                              <Input
                                value={cfg.base_url || ""}
                                onChange={(e) => updateProviderConfig(ptype, { base_url: e.target.value })}
                                placeholder="http://localhost:11434"
                                className="h-8 text-[11px] font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-[var(--t3)] mb-1">Model</label>
                              <Input
                                value={cfg.model || ""}
                                onChange={(e) => updateProviderConfig(ptype, { model: e.target.value })}
                                placeholder="llama3"
                                className="h-8 text-[11px] font-mono"
                              />
                            </div>
                          </>
                        )}

                        {/* Test button + result */}
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-3 text-[11px]"
                            onClick={() => handleTest(ptype)}
                            disabled={testing !== null}
                          >
                            {testing === ptype ? (
                              <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Testing...</>
                            ) : (
                              "Test"
                            )}
                          </Button>
                          {testResult && !testing && expandedProvider === ptype && (
                            <span className="flex items-center gap-1 text-[10px]">
                              {testResult.ok ? (
                                <><CheckCircle className="w-3 h-3 text-emerald-500" /> Connected</>
                              ) : (
                                <><XCircle className="w-3 h-3 text-[var(--red)]" /> {testResult.error}</>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {aiError && (
                <p className="text-[11px] text-[var(--red)]">{aiError}</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {tab === "general" && (
            <Button onClick={handleEncSave} disabled={!encoding.trim()}>
              {encSaved ? "Saved" : "Save"}
            </Button>
          )}
          {tab === "ai" && (
            <Button onClick={handleAiSave} disabled={aiSaving}>
              {aiSaving ? (
                <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Saving...</>
              ) : aiSaved ? "Saved" : "Save"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
