import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Info } from "lucide-react";

export type NewGroupConfig = {
  title: string;
  cryptoMode: "mls" | "admin-rotated";
  maxMembers: number;
  maxMessageKb: number;
};

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreate: (c: NewGroupConfig) => void;
};

const DEFAULT: NewGroupConfig = {
  title: "",
  cryptoMode: "admin-rotated",
  maxMembers: 20,
  maxMessageKb: 64,
};

/**
 * New group: MLS vs admin-rotated and room caps (v1 = local spec + future IPFS / Orbit sync).
 * Wire-up to group API comes next.
 */
export function CreateGroupDialog({ open, onOpenChange, onCreate }: Props) {
  const [cfg, setCfg] = useState<NewGroupConfig>(DEFAULT);

  const apply = () => {
    onCreate({ ...cfg, title: cfg.title.trim() || "Group" });
    onOpenChange(false);
    setCfg(DEFAULT);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New group</DialogTitle>
          <DialogDescription>
            Set membership cryptography and size limits. Pinned group content will follow alt.dream / IPFS
            policy once the sync layer is connected.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="gtitle">Name</Label>
            <Input
              id="gtitle"
              value={cfg.title}
              onChange={(e) => setCfg((c) => ({ ...c, title: e.target.value }))}
              placeholder="Project chat"
            />
          </div>
          <div>
            <Label>Group keys</Label>
            <Select
              value={cfg.cryptoMode}
              onValueChange={(v) =>
                setCfg((c) => ({ ...c, cryptoMode: v as NewGroupConfig["cryptoMode"] }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin-rotated">Admin-rotated (simpler, small groups)</SelectItem>
                <SelectItem value="mls" disabled>
                  MLS (multi-device, coming soon)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
              <Info className="h-3 w-3 mt-0.5 shrink-0" />
              MLS is stubbed; choose admin-rotated for the current build.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="mm">Max members</Label>
              <Input
                id="mm"
                type="number"
                min={2}
                max={500}
                value={cfg.maxMembers}
                onChange={(e) =>
                  setCfg((c) => ({ ...c, maxMembers: Math.max(2, parseInt(e.target.value, 10) || 2) }))
                }
              />
            </div>
            <div>
              <Label htmlFor="ms">Max message (KB)</Label>
              <Input
                id="ms"
                type="number"
                min={1}
                max={1024}
                value={cfg.maxMessageKb}
                onChange={(e) =>
                  setCfg((c) => ({ ...c, maxMessageKb: Math.max(1, parseInt(e.target.value, 10) || 1) }))
                }
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={apply}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
