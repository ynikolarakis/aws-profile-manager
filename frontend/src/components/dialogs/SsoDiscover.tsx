import { useEffect, useState } from "react";
import { useStore } from "@/store";
import type { SsoDiscoveredAccount } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Radar, Check } from "lucide-react";

interface Props {
  data: Record<string, unknown>;
  onClose: () => void;
}

export function SsoDiscover({ data, onClose }: Props) {
  const accounts = useStore((s) => s.ssoDiscoveredAccounts);
  const loading = useStore((s) => s.ssoDiscoverLoading);
  const error = useStore((s) => s.ssoDiscoverError);
  const discoverSsoAccounts = useStore((s) => s.discoverSsoAccounts);
  const importSsoAccounts = useStore((s) => s.importSsoAccounts);
  const regions = useStore((s) => s.regions);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [region, setRegion] = useState("eu-central-1");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ count: number } | null>(null);

  useEffect(() => {
    discoverSsoAccounts(data.sso_start_url as string | undefined);
  }, [discoverSsoAccounts, data.sso_start_url]);

  // Group accounts by account_id+account_name
  const grouped = accounts.reduce<
    Record<string, { account_name: string; account_id: string; account_email: string; roles: SsoDiscoveredAccount[] }>
  >((acc, item) => {
    const key = item.account_id;
    if (!acc[key]) {
      acc[key] = {
        account_name: item.account_name,
        account_id: item.account_id,
        account_email: item.account_email,
        roles: [],
      };
    }
    acc[key].roles.push(item);
    return acc;
  }, {});

  const toggleKey = (acct: SsoDiscoveredAccount) =>
    `${acct.account_id}:${acct.role_name}`;

  const toggle = (acct: SsoDiscoveredAccount) => {
    if (acct.already_exists) return;
    const key = toggleKey(acct);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectableAccounts = accounts.filter((a) => !a.already_exists);

  const selectAll = () => {
    setSelected(new Set(selectableAccounts.map(toggleKey)));
  };

  const selectNone = () => setSelected(new Set());

  const handleImport = async () => {
    const toImport = accounts
      .filter((a) => selected.has(toggleKey(a)))
      .map((a) => ({
        name: a.suggested_profile_name,
        sso_account_id: a.account_id,
        sso_role_name: a.role_name,
        sso_start_url: a.sso_start_url,
        sso_region: a.sso_region,
        region,
      }));
    if (toImport.length === 0) return;
    setImporting(true);
    const result = await importSsoAccounts(toImport);
    setImporting(false);
    if (result.ok) {
      setImportResult({ count: result.count || 0 });
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[480px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radar className="w-4 h-4 text-[var(--ac)]" />
            Discover SSO Accounts
          </DialogTitle>
          <DialogDescription>
            Auto-discover accounts and roles from your SSO organization
          </DialogDescription>
        </DialogHeader>

        {/* Import success */}
        {importResult && (
          <div className="flex flex-col items-center gap-2 py-6">
            <div className="w-10 h-10 rounded-full bg-[var(--green)]/10 flex items-center justify-center">
              <Check className="w-5 h-5 text-[var(--green)]" />
            </div>
            <p className="text-[13px] font-medium">
              Imported {importResult.count} profile{importResult.count !== 1 ? "s" : ""}
            </p>
            <Button variant="outline" onClick={onClose} className="mt-2">
              Close
            </Button>
          </div>
        )}

        {/* Loading */}
        {!importResult && loading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--ac)]" />
            <p className="text-[12px] text-[var(--t3)]">Discovering accounts...</p>
          </div>
        )}

        {/* Error */}
        {!importResult && !loading && error && (
          <div className="py-4">
            <div className="rounded-md border border-[var(--red)]/20 bg-[var(--red)]/5 px-3 py-2.5">
              <p className="text-[12px] text-[var(--red)]">{error}</p>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={onClose}>Close</Button>
            </DialogFooter>
          </div>
        )}

        {/* Results */}
        {!importResult && !loading && !error && accounts.length > 0 && (
          <div className="space-y-3">
            {/* Select All / None */}
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-medium text-[var(--t3)]">
                {accounts.length} role{accounts.length !== 1 ? "s" : ""} across {Object.keys(grouped).length} account{Object.keys(grouped).length !== 1 ? "s" : ""}
              </span>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-[10px] text-[var(--ac)] hover:underline">All</button>
                <button onClick={selectNone} className="text-[10px] text-[var(--t3)] hover:underline">None</button>
              </div>
            </div>

            {/* Grouped list */}
            <div className="max-h-[300px] overflow-y-auto border border-[var(--border)] rounded-md p-1 space-y-1">
              {Object.values(grouped).map((group) => (
                <div key={group.account_id}>
                  {/* Account header */}
                  <div className="px-2 py-1.5 text-[11px] font-semibold text-[var(--t2)] flex items-center gap-1.5">
                    <span>{group.account_name}</span>
                    <span className="text-[var(--t4)] font-mono font-normal">{group.account_id}</span>
                  </div>
                  {/* Roles */}
                  {group.roles.map((role) => {
                    const key = toggleKey(role);
                    const isSelected = selected.has(key);
                    return (
                      <label
                        key={key}
                        className="flex items-center gap-2.5 pl-4 pr-2 py-1 rounded-md cursor-pointer text-[12px] hover:bg-[var(--bg-2)]/50 transition-colors"
                      >
                        <Checkbox
                          checked={role.already_exists || isSelected}
                          disabled={role.already_exists}
                          onCheckedChange={() => toggle(role)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-[11px] truncate">{role.suggested_profile_name}</div>
                          <div className="text-[10px] text-[var(--t4)] truncate">{role.role_name}</div>
                        </div>
                        {role.already_exists && (
                          <Badge variant="outline" className="text-[9px] shrink-0">exists</Badge>
                        )}
                      </label>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Region selector */}
            <div>
              <label className="block text-[11px] font-medium text-[var(--t3)] mb-1">
                Default region for imported profiles
              </label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(regions.length > 0 ? regions : ["eu-central-1", "us-east-1", "us-west-2"]).map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                onClick={handleImport}
                disabled={selected.size === 0 || importing}
                className="gap-1"
              >
                {importing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Import {selected.size} Profile{selected.size !== 1 ? "s" : ""}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* No results */}
        {!importResult && !loading && !error && accounts.length === 0 && (
          <div className="py-6 text-center">
            <p className="text-[12px] text-[var(--t3)]">No accounts found.</p>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={onClose}>Close</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
