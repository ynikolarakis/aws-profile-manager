import { useState } from "react";
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

export function Settings({ onClose }: Props) {
  const terminalEncoding = useStore((s) => s.terminal_encoding);
  const defaultEncoding = useStore((s) => s.default_encoding);
  const setEncoding = useStore((s) => s.setEncoding);

  const [encoding, setEncodingValue] = useState(terminalEncoding);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setError(null);
    const result = await setEncoding(encoding);
    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Configure application preferences</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Terminal Encoding */}
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
                setError(null);
                setSaved(false);
              }}
              placeholder={defaultEncoding}
              className="font-mono"
            />
            {error && (
              <p className="text-[11px] text-[var(--red)] mt-1">{error}</p>
            )}

            {/* Quick pick buttons */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {COMMON_ENCODINGS.map((enc) => (
                <Badge
                  key={enc.value}
                  variant={encoding === enc.value ? "default" : "outline"}
                  className="cursor-pointer hover:bg-[var(--bg-2)] transition-colors text-[10px]"
                  onClick={() => {
                    setEncodingValue(enc.value);
                    setError(null);
                    setSaved(false);
                  }}
                >
                  {enc.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={handleSave} disabled={!encoding.trim()}>
            {saved ? "Saved" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
