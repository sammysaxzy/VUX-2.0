import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CustomerPortalSession } from "@/types";

export function CustomerPortalLoginPage() {
  const navigate = useNavigate();
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const login = async () => {
    setSubmitting(true);
    try {
      const session = await apiClient.customerPortalLogin({ identity, password, tenantId: tenantId || undefined });
      window.sessionStorage.setItem("portal-session", JSON.stringify(session satisfies CustomerPortalSession));
      navigate("/portal");
    } catch {
      toast.error("Unable to sign in to the customer portal.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <Card className="w-full max-w-md border-slate-800 bg-slate-900 text-white">
        <CardHeader>
          <CardTitle>Customer Self-Service Portal</CardTitle>
          <CardDescription className="text-slate-300">
            Sign in with your Customer ID or portal username to view service status, payments, tickets, and notices.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Customer ID or Username</Label>
            <Input
              value={identity}
              onChange={(event) => setIdentity(event.target.value)}
              placeholder="DRT000001 or your username"
              className="border-slate-700 bg-slate-950 text-white"
            />
          </div>
          <div className="space-y-1">
            <Label>Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="border-slate-700 bg-slate-950 text-white"
            />
          </div>
          <div className="space-y-1">
            <Label>Tenant ID (Optional)</Label>
            <Input
              value={tenantId}
              onChange={(event) => setTenantId(event.target.value)}
              placeholder="If your ISP gave you one"
              className="border-slate-700 bg-slate-950 text-white"
            />
          </div>
          <Button onClick={() => void login()} disabled={submitting} className="w-full">
            {submitting ? "Signing in..." : "Sign in"}
          </Button>
          <p className="text-xs text-slate-400">
            First-time users will be asked to change their temporary password after sign-in.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
