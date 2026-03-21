"use client";

import { useEffect, useState } from "react";
import type { RadiusSettings } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type SettingsFormProps = {
  settings?: RadiusSettings;
  onSave: (payload: RadiusSettings) => void;
  saving?: boolean;
};

export function SettingsForm({ settings, onSave, saving }: SettingsFormProps) {
  const [form, setForm] = useState<RadiusSettings>(
    settings ?? {
      radiusServerIp: "",
      sharedSecret: "",
      nasIp: "",
      coaEnabled: false,
      defaultDns: "",
      ipPool: "",
    },
  );

  useEffect(() => {
    if (settings) {
      setForm(settings);
    }
  }, [settings]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-1">
        <CardTitle>RADIUS Infrastructure Settings</CardTitle>
        <CardDescription>Store the connection details that power CoA and accounting.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="radius-server-ip">RADIUS Server IP</Label>
            <Input
              id="radius-server-ip"
              value={form.radiusServerIp}
              onChange={(event) => setForm((prev) => ({ ...prev, radiusServerIp: event.target.value }))}
              placeholder="10.250.1.12"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="shared-secret">Shared Secret</Label>
            <Input
              id="shared-secret"
              value={form.sharedSecret}
              type="password"
              onChange={(event) => setForm((prev) => ({ ...prev, sharedSecret: event.target.value }))}
              placeholder="••••••••"
            />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="nas-ip">NAS IP</Label>
            <Input
              id="nas-ip"
              value={form.nasIp}
              onChange={(event) => setForm((prev) => ({ ...prev, nasIp: event.target.value }))}
              placeholder="10.250.1.2"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="default-dns">Default DNS</Label>
            <Input
              id="default-dns"
              value={form.defaultDns}
              onChange={(event) => setForm((prev) => ({ ...prev, defaultDns: event.target.value }))}
              placeholder="1.1.1.1,8.8.8.8"
            />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="ip-pool">IP Pool</Label>
            <Input
              id="ip-pool"
              value={form.ipPool}
              onChange={(event) => setForm((prev) => ({ ...prev, ipPool: event.target.value }))}
              placeholder="10.20.1.0/24"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="coa-toggle">CoA toggle</Label>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.coaEnabled}
                onCheckedChange={(enabled) => setForm((prev) => ({ ...prev, coaEnabled: enabled }))}
              />
              <p className="text-sm text-muted-foreground">Allow change of authorization workflows.</p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button type="button" onClick={() => onSave(form)} disabled={saving || !settings}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
      </CardFooter>
    </Card>
  );
}
