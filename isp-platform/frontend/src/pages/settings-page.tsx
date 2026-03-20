import { useState } from "react";
import { Palette, Shield } from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function SettingsPage() {
  const branding = useAppStore((state) => state.branding);
  const setBranding = useAppStore((state) => state.setBranding);
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const [ispName, setIspName] = useState(branding?.ispName ?? "");
  const [logoUrl, setLogoUrl] = useState(branding?.logoUrl ?? "");

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Tenant branding and workspace preferences.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              Branding
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="ispName">ISP Name</Label>
              <Input id="ispName" value={ispName} onChange={(event) => setIspName(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input id="logoUrl" value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} />
            </div>
            <Button
              onClick={() =>
                setBranding({
                  tenantId: branding?.tenantId ?? "tenant-west-001",
                  ispName: ispName || "My ISP",
                  logoUrl: logoUrl || undefined,
                  primaryColor: branding?.primaryColor,
                })
              }
            >
              Save Branding
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Workspace
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-border/70 p-3">
              <div>
                <p className="font-medium">Dark Mode</p>
                <p className="text-sm text-muted-foreground">Switch between day and night NOC themes.</p>
              </div>
              <Switch checked={theme === "dark"} onCheckedChange={(value) => setTheme(value ? "dark" : "light")} />
            </div>
            <div className="rounded-xl border border-border/70 p-3">
              <p className="text-sm text-muted-foreground">Tenant ID</p>
              <Badge variant="outline" className="mt-1">
                {branding?.tenantId}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
