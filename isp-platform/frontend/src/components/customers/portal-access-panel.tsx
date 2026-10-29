"use client";

import { useMemo, useState } from "react";
import { ExternalLink, KeyRound, RefreshCw } from "lucide-react";
import { usePortalAccessStatus, useProvisionPortalAccess } from "@/hooks/api/use-portal-access";
import { formatDateTimeOrDash } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  customerId: string;
  tenantId: string;
  defaultUsername?: string;
  defaultEmail?: string;
  defaultPhone?: string;
};

export function PortalAccessPanel({ customerId, tenantId, defaultUsername, defaultEmail, defaultPhone }: Props) {
  const statusQuery = usePortalAccessStatus(customerId);
  const provisionMutation = useProvisionPortalAccess(customerId);
  const [username, setUsername] = useState(defaultUsername ?? customerId);
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [phone, setPhone] = useState(defaultPhone ?? "");
  const [newPassword, setNewPassword] = useState("");
  const portalIdentity = statusQuery.data?.username ?? username;
  const portalLoginHref = `/portal/login?tenantId=${encodeURIComponent(tenantId)}&identity=${encodeURIComponent(portalIdentity)}`;

  const hasAccess = statusQuery.isSuccess && Boolean(statusQuery.data);
  const visiblePassword = provisionMutation.data?.temporary_password ?? statusQuery.data?.admin_visible_password;
  const actionLabel = hasAccess ? "Reset Client Password" : "Create Portal Access";
  const helperText = useMemo(() => {
    if (visiblePassword) return "This is the latest portal password visible to the admin. Share it securely and ask the customer to change it after login.";
    return hasAccess
      ? "Reset access to set a fresh customer portal password from the admin side."
      : "Create a customer portal identity and set the customer's first portal password.";
  }, [hasAccess, visiblePassword]);

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-4 w-4" />
          Customer Portal Access
        </CardTitle>
        <CardDescription>
          Provision a tenant-scoped portal login for this customer and issue a temporary password for first sign-in.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Portal Username">
            <Input value={username} onChange={(event) => setUsername(event.target.value)} />
          </Field>
          <Field label="Portal Email">
            <Input value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <Field label="Portal Phone">
            <Input value={phone} onChange={(event) => setPhone(event.target.value)} />
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <Field label="New Portal Password">
            <Input
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Leave blank to auto-generate"
            />
          </Field>
          <div className="flex items-end">
            <div className="flex w-full flex-col gap-2 md:w-auto">
              <Button
                type="button"
                onClick={() =>
                  provisionMutation.mutate({
                    username,
                    email: email || undefined,
                    phone: phone || undefined,
                    temporaryPassword: newPassword || undefined,
                  })
                }
                disabled={provisionMutation.isPending || !username.trim()}
                className="w-full md:w-auto"
              >
                {provisionMutation.isPending ? (
                  "Processing..."
                ) : hasAccess ? (
                  <>
                    <RefreshCw className="mr-1 h-4 w-4" />
                    {actionLabel}
                  </>
                ) : (
                  actionLabel
                )}
              </Button>
              <a href={portalLoginHref} target="_blank" rel="noreferrer" className="w-full md:w-auto">
                <Button type="button" variant="outline" className="w-full md:w-auto">
                  <ExternalLink className="mr-1 h-4 w-4" />
                  Open Portal Login
                </Button>
              </a>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-muted/15 p-4 text-sm">
          <p className="font-medium">Status</p>
          {hasAccess ? (
            <div className="mt-2 space-y-1 text-muted-foreground">
              <p>Username: {statusQuery.data.username}</p>
              <p>Password: {statusQuery.data.admin_visible_password ?? "Not returned by backend yet"}</p>
              <p>Portal status: {statusQuery.data.is_active ? "Active" : "Inactive"}</p>
              <p>Last login: {formatDateTimeOrDash(statusQuery.data.last_login)}</p>
              <p>First login reset required: {statusQuery.data.first_login_required ? "Yes" : "No"}</p>
            </div>
          ) : (
            <p className="mt-2 text-muted-foreground">Portal access has not been created for this customer yet.</p>
          )}
          <p className="mt-3 text-muted-foreground">{helperText}</p>
          {visiblePassword ? (
            <div className="mt-3 rounded-xl border border-success/30 bg-success/10 p-3 text-foreground">
              <p className="font-medium">Latest portal credentials</p>
              <p className="mt-1 text-sm">Username: <span className="font-mono">{portalIdentity}</span></p>
              <p className="mt-1 text-sm">Password: <span className="font-mono">{visiblePassword}</span></p>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
