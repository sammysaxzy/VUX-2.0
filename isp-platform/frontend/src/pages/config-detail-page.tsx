"use client";

import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getConfigurationItem } from "@/components/settings/configuration-items";
import { useCreatePrivilegeAccount, usePermissionRoles, useUpdatePermissionRole } from "@/hooks/api/use-settings";
import { SettingsLayout } from "@/components/settings/settings-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { PrivilegeModel } from "@/types";

const privilegeModelOptions: PrivilegeModel[] = ["Role Based", "Approval Based", "Hybrid"];

export function ConfigDetailPage() {
  const { section } = useParams();
  const navigate = useNavigate();
  const item = getConfigurationItem(section);
  const permissionsQuery = usePermissionRoles();
  const updatePermissionRoleMutation = useUpdatePermissionRole();
  const createPrivilegeAccountMutation = useCreatePrivilegeAccount();
  const initialForm = useMemo(
    () =>
      item
        ? Object.fromEntries(
            item.sections.flatMap((entry) =>
              entry.fields.map((field) => [field.id, field.type === "toggle" ? false : field.type === "select" ? field.options[0] : ""]),
            ),
          )
        : {},
    [item],
  );
  const [values, setValues] = useState<Record<string, string | boolean>>(initialForm);
  const [accountForm, setAccountForm] = useState({ fullName: "", email: "", roleId: "" });
  const [roleModels, setRoleModels] = useState<Record<string, PrivilegeModel>>({});

  useEffect(() => {
    setValues(initialForm);
  }, [initialForm]);

  useEffect(() => {
    const roles = permissionsQuery.data ?? [];
    setRoleModels(
      Object.fromEntries(roles.map((role) => [role.id, (role.privilegeModel ?? "Role Based") as PrivilegeModel])),
    );
    setAccountForm((current) => ({
      ...current,
      roleId: current.roleId || roles[0]?.id || "",
    }));
  }, [permissionsQuery.data]);

  if (!item) {
    return <Navigate to="/settings/configuration" replace />;
  }

  if (item.slug === "admin") {
    const permissionRoles = permissionsQuery.data ?? [];

    return (
      <SettingsLayout
        activeTab="configuration"
        summary={item.label}
        description="Manage global system behavior for portal experience, communications, automation, billing, and integrations."
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Configuration / {item.label}</p>
              <h2 className="text-xl font-semibold">{item.label}</h2>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
            <Button type="button" variant="outline" onClick={() => navigate("/settings/configuration")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>

          {permissionsQuery.isLoading ? (
            <PageSkeleton />
          ) : (
            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Privilege Models</CardTitle>
                  <CardDescription>Control existing privilege models and keep administrator accounts tied to permission roles.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {permissionRoles.map((role) => (
                    <div key={role.id} className="rounded-xl border border-border/70 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-1">
                          <p className="font-medium">{role.name}</p>
                          <p className="text-sm text-muted-foreground">{role.description}</p>
                          <p className="text-xs text-muted-foreground">
                            Scope: {role.scope} | Members: {role.accounts?.length ?? role.memberCount}
                          </p>
                        </div>
                        <div className="flex w-full flex-col gap-2 lg:w-64">
                          <Select
                            value={roleModels[role.id] ?? role.privilegeModel ?? "Role Based"}
                            onChange={(event) =>
                              setRoleModels((current) => ({
                                ...current,
                                [role.id]: event.target.value as PrivilegeModel,
                              }))
                            }
                          >
                            {privilegeModelOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={updatePermissionRoleMutation.isPending}
                            onClick={() =>
                              updatePermissionRoleMutation.mutate({
                                id: role.id,
                                payload: { privilegeModel: roleModels[role.id] ?? role.privilegeModel ?? "Role Based" },
                              })
                            }
                          >
                            Save Model
                          </Button>
                        </div>
                      </div>
                      {(role.accounts ?? []).length > 0 ? (
                        <div className="mt-3 rounded-lg bg-muted/30 p-3">
                          <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Assigned Accounts</p>
                          <div className="space-y-1">
                            {(role.accounts ?? []).map((account) => (
                              <p key={account.id} className="text-sm">
                                {account.fullName} <span className="text-muted-foreground">({account.email})</span>
                              </p>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Create Privileged Account</CardTitle>
                  <CardDescription>Assign new administrator accounts directly into an existing permission role.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="admin-account-name">Full Name</Label>
                    <Input
                      id="admin-account-name"
                      value={accountForm.fullName}
                      onChange={(event) => setAccountForm((current) => ({ ...current, fullName: event.target.value }))}
                      placeholder="Operations Manager"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="admin-account-email">Email</Label>
                    <Input
                      id="admin-account-email"
                      type="email"
                      value={accountForm.email}
                      onChange={(event) => setAccountForm((current) => ({ ...current, email: event.target.value }))}
                      placeholder="ops.manager@westlink.io"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="admin-account-role">Permission Role</Label>
                    <Select
                      id="admin-account-role"
                      value={accountForm.roleId}
                      onChange={(event) => setAccountForm((current) => ({ ...current, roleId: event.target.value }))}
                    >
                      <option value="">Select role</option>
                      {permissionRoles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Button
                    type="button"
                    disabled={
                      createPrivilegeAccountMutation.isPending ||
                      !accountForm.fullName.trim() ||
                      !accountForm.email.trim() ||
                      !accountForm.roleId
                    }
                    onClick={() =>
                      createPrivilegeAccountMutation.mutate(
                        {
                          fullName: accountForm.fullName,
                          email: accountForm.email,
                          roleId: accountForm.roleId,
                        },
                        {
                          onSuccess: () =>
                            setAccountForm({
                              fullName: "",
                              email: "",
                              roleId: permissionRoles[0]?.id ?? "",
                            }),
                        },
                      )
                    }
                  >
                    {createPrivilegeAccountMutation.isPending ? "Creating..." : "Create Privilege Account"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout
      activeTab="configuration"
      summary={item.label}
      description="Manage global system behavior for portal experience, communications, automation, billing, and integrations."
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Configuration / {item.label}</p>
            <h2 className="text-xl font-semibold">{item.label}</h2>
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </div>
          <Button type="button" variant="outline" onClick={() => navigate("/settings/configuration")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>

        {item.sections.map((sectionItem) => (
          <Card key={sectionItem.title}>
            <CardHeader>
              <CardTitle>{sectionItem.title}</CardTitle>
              <CardDescription>{sectionItem.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {sectionItem.fields.map((field) => {
                  if (field.type === "toggle") {
                    return (
                      <div key={field.id} className="rounded-xl border border-border/70 p-4 md:col-span-2">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <Label htmlFor={field.id}>{field.label}</Label>
                            <p className="mt-1 text-sm text-muted-foreground">{field.helper}</p>
                          </div>
                          <Switch
                            checked={Boolean(values[field.id])}
                            onCheckedChange={(checked) => setValues((current) => ({ ...current, [field.id]: checked }))}
                          />
                        </div>
                      </div>
                    );
                  }

                  if (field.type === "textarea") {
                    return (
                      <div key={field.id} className="space-y-1 md:col-span-2">
                        <Label htmlFor={field.id}>{field.label}</Label>
                        <Textarea
                          id={field.id}
                          value={String(values[field.id] ?? "")}
                          placeholder={field.placeholder}
                          onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.value }))}
                        />
                      </div>
                    );
                  }

                  if (field.type === "select") {
                    return (
                      <div key={field.id} className="space-y-1">
                        <Label htmlFor={field.id}>{field.label}</Label>
                        <Select
                          id={field.id}
                          value={String(values[field.id] ?? field.options[0])}
                          onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.value }))}
                        >
                          {field.options.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </Select>
                      </div>
                    );
                  }

                  return (
                    <div key={field.id} className="space-y-1">
                      <Label htmlFor={field.id}>{field.label}</Label>
                      <Input
                        id={field.id}
                        type={field.type}
                        value={String(values[field.id] ?? "")}
                        placeholder={field.placeholder}
                        onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.value }))}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end">
                <Button type="button" onClick={() => toast.success(`${item.label} configuration saved.`)}>
                  Save Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </SettingsLayout>
  );
}
