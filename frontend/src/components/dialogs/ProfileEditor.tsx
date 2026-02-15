import { useState, useEffect } from "react";
import { useStore } from "@/store";
import type { Profile } from "@/types";
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { cn } from "@/lib/utils";

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

  const [ssoStartUrl, setSsoStartUrl] = useState(existing?.sso_start_url || "");
  const [ssoRegion, setSsoRegion] = useState(existing?.sso_region || "");
  const [ssoAccountId, setSsoAccountId] = useState(existing?.sso_account_id || "");
  const [ssoRoleName, setSsoRoleName] = useState(existing?.sso_role_name || "");

  const [accessKeyId, setAccessKeyId] = useState(existing?.aws_access_key_id || "");
  const [secretKey, setSecretKey] = useState("");
  const [sessionToken, setSessionToken] = useState(existing?.aws_session_token || "");

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
      name, type, region, output, _cat_id: catId,
    };
    if (editName) payload._orig_name = editName;

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

  const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="block text-[11px] font-medium text-[var(--t3)] mb-1">{children}</label>
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[420px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editName ? "Edit Profile" : "New Profile"}</DialogTitle>
          <DialogDescription>
            {editName ? "Modify profile configuration" : "Create a new AWS CLI profile"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Name */}
          <div>
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-profile"
              className={cn(nameError && "border-[var(--red)] focus-visible:ring-[var(--red)]")}
            />
            {nameError && <div className="text-[11px] text-[var(--red)] mt-1">{nameError}</div>}
          </div>

          {/* Category */}
          <div>
            <Label>Category</Label>
            <Select value={catId} onValueChange={setCatId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {Object.entries(categories).map(([id, cat]) => (
                  <SelectItem key={id} value={id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type selector */}
          <div>
            <Label>Type</Label>
            <div className="flex gap-1">
              {(["sso", "credentials", "role"] as const).map((t) => (
                <Button
                  key={t}
                  variant={type === t ? "default" : "outline"}
                  size="sm"
                  className={cn("flex-1 uppercase text-[11px]", type !== t && "text-[var(--t2)]")}
                  onClick={() => setType(t)}
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>

          {/* SSO fields */}
          {type === "sso" && (
            <>
              <div>
                <Label>SSO Start URL</Label>
                <Input value={ssoStartUrl} onChange={(e) => setSsoStartUrl(e.target.value)} />
              </div>
              <div>
                <Label>SSO Region</Label>
                <Input value={ssoRegion} onChange={(e) => setSsoRegion(e.target.value)} />
              </div>
              <div>
                <Label>Account ID</Label>
                <Input value={ssoAccountId} onChange={(e) => setSsoAccountId(e.target.value)} />
              </div>
              <div>
                <Label>Role Name</Label>
                <Input value={ssoRoleName} onChange={(e) => setSsoRoleName(e.target.value)} />
              </div>
            </>
          )}

          {/* Credentials fields */}
          {type === "credentials" && (
            <>
              <div>
                <Label>Access Key ID</Label>
                <Input value={accessKeyId} onChange={(e) => setAccessKeyId(e.target.value)} />
              </div>
              <div>
                <Label>Secret Access Key</Label>
                <Input
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder={existing?.has_keys ? "(unchanged)" : ""}
                />
              </div>
              <div>
                <Label>Session Token (optional)</Label>
                <Input value={sessionToken} onChange={(e) => setSessionToken(e.target.value)} />
              </div>
            </>
          )}

          {/* Role fields */}
          {type === "role" && (
            <>
              <div>
                <Label>Role ARN</Label>
                <Input value={roleArn} onChange={(e) => setRoleArn(e.target.value)} />
              </div>
              <div>
                <Label>Source Profile</Label>
                <Select value={sourceProfile} onValueChange={setSourceProfile}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(profiles).map((n) => (
                      <SelectItem key={n} value={n}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>External ID (optional)</Label>
                <Input value={externalId} onChange={(e) => setExternalId(e.target.value)} />
              </div>
            </>
          )}

          {/* Region + Output */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Label>Region</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {regions.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>Output</Label>
              <Select value={output} onValueChange={setOutput}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">json</SelectItem>
                  <SelectItem value="table">table</SelectItem>
                  <SelectItem value="text">text</SelectItem>
                  <SelectItem value="yaml">yaml</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={!name || !!nameError || saving}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
