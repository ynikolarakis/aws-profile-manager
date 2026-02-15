import { create } from "zustand";
import { get, post } from "@/lib/api";
import { applyTheme } from "@/lib/theme";
import type {
  AppState,
  CostData,
  DialogState,
  Identity,
  ServiceDef,
  SsoDiscoveredAccount,
  TerminalLine,
} from "@/types";

interface Store extends AppState {
  // UI state
  identity: Identity | null;
  costData: CostData | null;
  ssoStatus: Record<string, string>;
  costBadges: Record<string, string>;
  detailProfile: string | null;
  discoveredServices: Array<{ name: string; cost: number | null }>;
  discoveredServicesProfile: string | null;
  servicesLoading: boolean;
  dialog: DialogState;
  search: string;
  terminalLines: TerminalLine[];
  terminalBusy: boolean;
  terminalHistory: string[];
  lineCounter: number;
  commandPaletteOpen: boolean;
  ssoDiscoveredAccounts: SsoDiscoveredAccount[];
  ssoDiscoverLoading: boolean;
  ssoDiscoverError: string | null;

  // Actions
  init: () => Promise<void>;
  activate: (name: string) => Promise<void>;
  saveProfile: (data: Record<string, unknown>) => Promise<{ error?: string; ok?: boolean }>;
  deleteProfile: (name: string) => Promise<void>;
  addCategory: (name: string, color: string) => Promise<string>;
  editCategory: (cid: string, name: string, color: string) => Promise<void>;
  deleteCategory: (cid: string) => Promise<void>;
  toggleCollapsed: (cid: string) => Promise<void>;
  setProfileCategory: (profile: string, catId: string) => Promise<void>;
  addFavorite: (label: string, cmd: string) => Promise<void>;
  removeFavorite: (cmd: string) => Promise<void>;
  setTheme: (theme: string) => Promise<void>;
  runCommand: (cmd: string) => Promise<void>;
  bulkRun: (profiles: string[], cmd: string) => Promise<void>;
  reload: () => Promise<void>;
  discoverServices: (profile?: string) => Promise<void>;
  getCost: (profile: string, year: number, month: number) => Promise<void>;
  fetchCostBadges: () => Promise<void>;
  discoverSsoAccounts: (ssoStartUrl?: string) => Promise<void>;
  importSsoAccounts: (accounts: Array<Record<string, string>>) => Promise<{ ok?: boolean; count?: number; error?: string }>;
  setEncoding: (encoding: string) => Promise<{ ok?: boolean; error?: string }>;

  // UI actions
  setSearch: (s: string) => void;
  setDialog: (d: DialogState) => void;
  setDetailProfile: (name: string | null) => void;
  clearTerminal: () => void;
  addTerminalLine: (text: string, type: TerminalLine["type"]) => void;
  setTerminalBusy: (v: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;

  // SSE event handlers
  handleSSE: (event: string, data: Record<string, unknown>) => void;
}

export const useStore = create<Store>((set, _get) => ({
  // Initial state
  profiles: {},
  categories: {},
  profile_cat: {},
  favorites: [],
  theme: "dark",
  active: "",
  collapsed: {},
  regions: [],
  services_map: {},
  terminal_encoding: "",
  default_encoding: "",
  identity: null,
  costData: null,
  ssoStatus: {},
  costBadges: {},
  detailProfile: null,
  discoveredServices: [],
  discoveredServicesProfile: null,
  servicesLoading: false,
  dialog: { type: null },
  search: "",
  terminalLines: [],
  terminalBusy: false,
  terminalHistory: [],
  lineCounter: 0,
  commandPaletteOpen: false,
  ssoDiscoveredAccounts: [],
  ssoDiscoverLoading: false,
  ssoDiscoverError: null,

  init: async () => {
    const state = await get<AppState>("/state");
    applyTheme(state.theme);
    set({
      profiles: state.profiles,
      categories: state.categories,
      profile_cat: state.profile_cat,
      favorites: state.favorites,
      theme: state.theme,
      active: state.active,
      collapsed: state.collapsed,
      regions: state.regions,
      services_map: state.services_map,
      terminal_encoding: state.terminal_encoding || "",
      default_encoding: state.default_encoding || "",
    });
  },

  activate: async (name) => {
    await post("/activate", { name });
    set({ active: name });
  },

  saveProfile: async (data) => {
    const result = await post<{ error?: string; ok?: boolean }>("/save_profile", data);
    if (result.ok) {
      const state = await get<AppState>("/state");
      set({
        profiles: state.profiles,
        categories: state.categories,
        profile_cat: state.profile_cat,
      });
    }
    return result;
  },

  deleteProfile: async (name) => {
    await post("/delete_profile", { name });
    const state = await get<AppState>("/state");
    set({ profiles: state.profiles, profile_cat: state.profile_cat });
  },

  addCategory: async (name, color) => {
    const result = await post<{ id: string }>("/add_category", { name, color });
    const state = await get<AppState>("/state");
    set({ categories: state.categories });
    return result.id;
  },

  editCategory: async (cid, name, color) => {
    await post("/edit_category", { cid, name, color });
    const state = await get<AppState>("/state");
    set({ categories: state.categories });
  },

  deleteCategory: async (cid) => {
    await post("/delete_category", { cid });
    const state = await get<AppState>("/state");
    set({ categories: state.categories, profile_cat: state.profile_cat });
  },

  toggleCollapsed: async (cid) => {
    const result = await post<{ collapsed: boolean }>("/toggle_collapsed", { cid });
    set((s) => ({
      collapsed: { ...s.collapsed, [cid]: result.collapsed },
    }));
  },

  setProfileCategory: async (profile, catId) => {
    await post("/set_profile_category", { profile, cat_id: catId });
    const state = await get<AppState>("/state");
    set({ profile_cat: state.profile_cat });
  },

  addFavorite: async (label, cmd) => {
    await post("/add_favorite", { label, cmd });
    const state = await get<AppState>("/state");
    set({ favorites: state.favorites });
  },

  removeFavorite: async (cmd) => {
    await post("/remove_favorite", { cmd });
    const state = await get<AppState>("/state");
    set({ favorites: state.favorites });
  },

  setTheme: async (theme) => {
    await post("/set_theme", { theme });
    applyTheme(theme);
    set({ theme });
  },

  runCommand: async (cmd) => {
    set((s) => ({
      terminalBusy: true,
      terminalHistory: [cmd, ...s.terminalHistory.filter((h) => h !== cmd)].slice(0, 50),
    }));
    const store = _get();
    store.addTerminalLine(`${store.active} ❯ ${cmd}`, "prompt");
    await post("/run", { cmd });
  },

  bulkRun: async (profiles, cmd) => {
    set({ terminalBusy: true });
    await post("/bulk_run", { profiles, cmd });
  },

  reload: async () => {
    const state = await post<AppState>("/reload", {});
    set({
      profiles: state.profiles,
      categories: state.categories,
      profile_cat: state.profile_cat,
      favorites: state.favorites,
      theme: state.theme,
      active: state.active,
      collapsed: state.collapsed,
    });
  },

  discoverServices: async (profile) => {
    set({ servicesLoading: true });
    await post("/discover_services", { profile: profile || null });
  },

  getCost: async (profile, year, month) => {
    set({ costData: null });
    await post("/get_cost", { profile, year, month });
  },

  fetchCostBadges: async () => {
    await post("/fetch_cost_badges", {});
  },

  discoverSsoAccounts: async (ssoStartUrl) => {
    set({ ssoDiscoverLoading: true, ssoDiscoverError: null, ssoDiscoveredAccounts: [] });
    await post("/discover_sso_accounts", { sso_start_url: ssoStartUrl || null });
  },

  setEncoding: async (encoding) => {
    const result = await post<{ ok?: boolean; error?: string; encoding?: string }>("/set_encoding", { encoding });
    if (result.ok && result.encoding) {
      set({ terminal_encoding: result.encoding });
    }
    return result;
  },

  importSsoAccounts: async (accounts) => {
    const result = await post<{ ok?: boolean; count?: number; error?: string }>("/import_sso_accounts", { accounts });
    if (result.ok) {
      const state = await get<AppState>("/state");
      set({
        profiles: state.profiles,
        categories: state.categories,
        profile_cat: state.profile_cat,
      });
    }
    return result;
  },

  // UI actions
  setSearch: (s) => set({ search: s }),
  setDialog: (d) => set({ dialog: d }),
  setDetailProfile: (name) => set({ detailProfile: name }),
  clearTerminal: () => set({ terminalLines: [], lineCounter: 0 }),
  addTerminalLine: (text, type) =>
    set((s) => ({
      terminalLines: [...s.terminalLines, { id: s.lineCounter, text, type }],
      lineCounter: s.lineCounter + 1,
    })),
  setTerminalBusy: (v) => set({ terminalBusy: v }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  // SSE event handlers
  handleSSE: (event, data) => {
    switch (event) {
      case "term":
        if ((data as { type: string }).type === "output") {
          set((s) => ({
            terminalLines: [
              ...s.terminalLines,
              {
                id: s.lineCounter,
                text: (data as { text: string }).text,
                type: ((data as { text: string }).text.startsWith("ERROR") ? "error" : "output") as TerminalLine["type"],
              },
            ],
            lineCounter: s.lineCounter + 1,
          }));
        } else if ((data as { type: string }).type === "done") {
          set({ terminalBusy: false });
        }
        break;
      case "identity":
        set({ identity: data as unknown as Identity });
        break;
      case "services": {
        const svcData = data as {
          svcs: Array<{ name: string; cost: number | null }>;
          profile: string;
          svc_defs?: Record<string, ServiceDef>;
        };
        set((s) => ({
          discoveredServices: svcData.svcs,
          discoveredServicesProfile: svcData.profile,
          servicesLoading: false,
          services_map: svcData.svc_defs
            ? { ...s.services_map, ...svcData.svc_defs }
            : s.services_map,
        }));
        break;
      }
      case "cost_data":
        set({ costData: data as unknown as CostData });
        break;
      case "cost_badge":
        set((s) => ({
          costBadges: {
            ...s.costBadges,
            [(data as { profile: string }).profile]: (data as { cost: string }).cost,
          },
        }));
        break;
      case "sso_status":
        set({ ssoStatus: data as Record<string, string> });
        break;
      case "sso_accounts": {
        const ssoData = data as { accounts?: SsoDiscoveredAccount[]; error?: string | null };
        set({
          ssoDiscoveredAccounts: ssoData.accounts || [],
          ssoDiscoverLoading: false,
          ssoDiscoverError: ssoData.error || null,
        });
        break;
      }
    }
  },
}));
