import React, { useEffect } from "react";
import { useStore } from "@/store";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Star, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const typeColors: Record<string, string> = {
  sso: "var(--green)",
  credentials: "var(--violet)",
  role: "var(--amber)",
};

const typeVariant: Record<string, "success" | "warning" | "outline"> = {
  sso: "success",
  credentials: "outline",
  role: "warning",
};

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
  const discoveredServices = useStore((s) => s.discoveredServices);
  const discoveredServicesProfile = useStore((s) => s.discoveredServicesProfile);
  const servicesLoading = useStore((s) => s.servicesLoading);
  const [expandedSvc, setExpandedSvc] = React.useState<string | null>(null);

  const profile = detailProfile ? profiles[detailProfile] : null;

  useEffect(() => {
    if (detailProfile) {
      discoverServices(detailProfile);
    }
  }, [detailProfile, discoverServices]);

  const services =
    discoveredServicesProfile === detailProfile
      ? discoveredServices
      : [];

  if (!detailProfile || !profile) return null;

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
    <Sheet open onOpenChange={(open) => !open && setDetailProfile(null)}>
      <SheetContent side="right" className="overflow-y-auto p-6">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg opacity-20"
              style={{ background: typeColors[profile.type] || "var(--t4)" }}
            />
            <div>
              <SheetTitle>{detailProfile}</SheetTitle>
              <SheetDescription>
                <Badge variant={typeVariant[profile.type] || "outline"} className="mt-1">
                  {profile.type}
                </Badge>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Details grid */}
        <div className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-1.5 mb-5">
          {details.map((d) => (
            <div key={d.label} className="contents">
              <span className="text-[11px] text-[var(--t3)]">{d.label}</span>
              <span className="text-[12px] font-mono text-[var(--t1)] break-all">
                {d.value}
              </span>
            </div>
          ))}
        </div>

        {/* Category */}
        <div className="mb-5">
          <label className="block text-[11px] font-medium text-[var(--t3)] mb-1">Category</label>
          <Select
            value={profileCat[detailProfile] || "__none__"}
            onValueChange={(val) => setProfileCategory(detailProfile, val)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {Object.entries(categories).map(([id, cat]) => (
                <SelectItem key={id} value={id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Services */}
        <h3 className="text-[12px] font-semibold text-[var(--t3)] uppercase tracking-wider mb-2">
          Services{!servicesLoading && services.length > 0 && ` (${services.length})`}
        </h3>

        {servicesLoading ? (
          <div className="flex items-center gap-2 py-4 text-[var(--t4)]">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-[11px]">Discovering services...</span>
          </div>
        ) : (
          <div className="space-y-1">
            {services.map((svc) => {
              const svcDef = servicesMap[svc.name] || {
                icon: "☁️",
                short: svc.name.replace(/^Amazon /, "").replace(/^AWS /, ""),
                color: "#71717a",
                desc: "",
                cmds: [],
              };

              const isExpanded = expandedSvc === svc.name;

              return (
                <div key={svc.name}>
                  <button
                    onClick={() => setExpandedSvc(isExpanded ? null : svc.name)}
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-left hover:bg-[var(--bg-2)] transition-colors"
                  >
                    <ChevronRight
                      className={cn(
                        "w-3 h-3 text-[var(--t4)] shrink-0 transition-transform duration-150",
                        isExpanded && "rotate-90"
                      )}
                    />
                    <span className="text-[14px]">{svcDef.icon}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-[12px] font-medium block">{svcDef.short}</span>
                      {svcDef.desc && (
                        <span className="text-[10px] text-[var(--t4)] block truncate">
                          {svcDef.desc}
                        </span>
                      )}
                    </div>
                    {svc.cost !== null && (
                      <span className="text-[10px] font-mono text-[var(--t3)] shrink-0">
                        ${svc.cost.toFixed(2)}
                      </span>
                    )}
                  </button>

                  {isExpanded && svcDef.cmds.length > 0 && (
                    <div className="pl-8 pb-1 space-y-0.5">
                      {svcDef.cmds.map((cmd) => (
                        <div key={cmd[0]} className="flex items-center gap-1 py-0.5">
                          <button
                            onClick={() => runCommand(cmd[1])}
                            className="text-[11px] text-[var(--ac)] hover:underline text-left"
                          >
                            {cmd[0]}
                          </button>
                          <button
                            onClick={() => addFavorite(cmd[0], cmd[1])}
                            className="ml-auto text-[var(--t4)] hover:text-[var(--amber)] transition-colors"
                          >
                            <Star className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
