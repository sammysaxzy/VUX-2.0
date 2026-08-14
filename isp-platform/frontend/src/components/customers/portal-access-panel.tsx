"use client";

import { useMemo, useState } from "react";
import { KeyRound, RefreshCw } from "lucide-react";
import { usePortalAccessStatus, useProvisionPortalAccess } from "@/hooks/api/use-portal-access";
import { formatDateTimeOrDash } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  customerId: string;
  defaultUsername?: string;
  defaultEmail?: string;
  defaultPhone?: string;
};

export function PortalAccessPanel({ customerId, defaultUsername, defaultEmail, defaultPhone }: Props) {
  const statusQuery = usePortalAccessStatus(customerId);
  const provisionMutation = useProvisionPortalAccess(customerId);
  const [username, setUsername] = useState(defaultUsername ?? customerId);
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [phone, setPhone] = useState(defaultPhone ?? "");
  const [temporaryPassword, setTemporaryPassword] = useState("");

  const hasAccess = statusQuery.isSuccess && Boolean(statusQuery.data);
  const temporaryResult = provisionMutation.data?.temporary_password;
  const actionLabel = hasAccess ? "Reset Portal Access" : "Create Portal Access";
  const helperText = useMemo(() => {
    if (temporaryResult) return "Temporary password generated below. Share it securely and require the customer to change it on first login.";
    return "Create a customer portal identity without exposing the customer's permanent service password.";
  }, [temporaryResult]);

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
          <Field label="Optional Temporary Password">
            <Input
              value={temporaryPassword}
              onChange={(event) => setTemporaryPassword(event.target.value)}
              placeholder="Leave blank to auto-generate"
            />
          </Field>
          <div className="flex items-end">
            <Button
              type="button"
              onClick={() =>
                provisionMutation.mutate({
                  username,
                  email: email || undefined,
                  phone: phone || undefined,
                  temporaryPassword: temporaryPassword || undefined,
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
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-muted/15 p-4 text-sm">
          <p className="font-medium">Status</p>
          {hasAccess ? (
            <div className="mt-2 space-y-1 text-muted-foreground">
              <p>Username: {statusQuery.data.username}</p>
              <p>Last login: {formatDateTimeOrDash(statusQuery.data.last_login)}</p>
              <p>First login reset required: {statusQuery.data.first_login_required ? "Yes" : "No"}</p>
            </div>
          ) : (
            <p className="mt-2 text-muted-foreground">Portal access has not been created for this customer yet.</p>
          )}
          <p className="mt-3 text-muted-foreground">{helperText}</p>
          {temporaryResult ? (
            <div className="mt-3 rounded-xl border border-success/30 bg-success/10 p-3 text-foreground">
              <p className="font-medium">Temporary password</p>
              <p className="mt-1 font-mono text-sm">{temporaryResult}</p>
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
