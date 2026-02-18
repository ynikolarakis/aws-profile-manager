export interface Profile {
  name: string;
  type: "sso" | "credentials" | "role";
  region: string;
  output: string;
  // SSO fields
  sso_start_url?: string;
  sso_region?: string;
  sso_account_id?: string;
  sso_role_name?: string;
  sso_session?: string;
  // Credentials fields
  aws_access_key_id?: string;
  aws_secret_access_key?: string;
  aws_session_token?: string;
  has_keys?: boolean;
  // Role fields
  role_arn?: string;
  source_profile?: string;
  external_id?: string;
}

export interface Category {
  name: string;
  color: string;
  order: number;
}

export interface Favorite {
  label: string;
  cmd: string;
}

export interface ServiceCmd {
  0: string; // label
  1: string; // command
}

export interface ServiceDef {
  icon: string;
  short: string;
  color: string;
  desc: string;
  cmds: ServiceCmd[];
}

export interface Identity {
  account: string;
  arn: string;
  error: string | null;
}

export interface CostData {
  services: Array<{ name: string; cost: number }>;
  total: number;
  error: string | null;
}

export interface TerminalLine {
  id: number;
  text: string;
  type: "output" | "prompt" | "cmd" | "error" | "info" | "ai-command";
}

export interface AppState {
  profiles: Record<string, Profile>;
  categories: Record<string, Category>;
  profile_cat: Record<string, string>;
  favorites: Favorite[];
  theme: string;
  active: string;
  collapsed: Record<string, boolean>;
  regions: string[];
  services_map: Record<string, ServiceDef>;
  terminal_encoding: string;
  default_encoding: string;
  has_llm_configured: boolean;
}

// --- LLM / AI types ---

export type LlmProviderType = "bedrock" | "anthropic" | "openai" | "google" | "openrouter" | "ollama";

export interface LlmProviderConfig {
  api_key?: string;
  has_api_key?: boolean;
  model?: string;
  bedrock_profile?: string;
  bedrock_region?: string;
  base_url?: string;
}

export interface LlmConfig {
  default_provider: LlmProviderType | null;
  providers: Partial<Record<LlmProviderType, LlmProviderConfig>>;
}

export interface SsoDiscoveredAccount {
  account_id: string;
  account_name: string;
  account_email: string;
  role_name: string;
  suggested_profile_name: string;
  already_exists: boolean;
  sso_start_url: string;
  sso_region: string;
}

// --- Infrastructure Diagram types ---

export interface DiscoveredResource {
  id: string;
  arn: string;
  resource_type: string;
  service: string;
  name: string;
  region: string;
  properties: Record<string, unknown>;
  tags: Record<string, string>;
}

export interface ResourceEdge {
  source_id: string;
  target_id: string;
  edge_type: string;
  label: string;
}

export interface InfraGraph {
  resources: Record<string, DiscoveredResource>;
  edges: ResourceEdge[];
  scan_errors: Array<{ service: string; error: string }>;
  profile: string;
  region: string;
  account_id: string;
}

export interface InfraScanProgress {
  service: string;
  index: number;
  total: number;
  status: "scanning" | "done" | "error";
  error?: string;
}

export interface LlmLayoutResult {
  groups: Record<string, string[]>;
  annotations: string[];
  resource_labels: Record<string, string>;
}

export type DialogType =
  | "profile-editor"
  | "category-editor"
  | "cost-explorer"
  | "bulk-run"
  | "favorite-editor"
  | "sso-discover"
  | "settings"
  | "infra-diagram"
  | null;

export interface DialogState {
  type: DialogType;
  data?: Record<string, unknown>;
}
