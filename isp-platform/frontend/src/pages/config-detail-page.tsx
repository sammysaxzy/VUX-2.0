"use client";

import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getConfigurationItem } from "@/components/settings/configuration-items";
import { useCreatePrivilegeAccount, usePermissionRoles, useUpdatePermissionRole } from "@/hooks/api/use-settings";
import { flattenPermissionMembers, hasPermission, canManagePermissions } from "@/lib/permissions";
import { useAppStore } from "@/store/app-store";
import { useAdminStore } from "@/store/admin-store";
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
import type { MemberRole, PermissionFlags, PermissionKey, PrivilegeModel } from "@/types";

const privilegeModelOptions: PrivilegeModel[] = ["Role Based", "Approval Based", "Hybrid"];
const CONFIG_STORAGE_PREFIX = "oss-bss-config";
const permissionFields: Array<{ key: PermissionKey; label: string; helper: string }> = [
  { key: "radius_access", label: "RADIUS Access", helper: "Allow access to PPPoE sessions and user operations." },
  { key: "disconnect_user", label: "Disconnect User", helper: "Allow active RADIUS sessions to be disconnected manually." },
  { key: "create_pppoe", label: "Create PPPoE", helper: "Allow provisioning of new PPPoE users." },
  { key: "view_customers", label: "View Customers", helper: "Allow CRM customer screens and customer details to be accessed." },
  { key: "delete_customer", label: "Delete Customer", helper: "Allow CRM customer deletion after confirmation." },
  { key: "billing_access", label: "Billing Access", helper: "Allow access to billing-related operations and data." },
  { key: "settings_access", label: "Settings Access", helper: "Allow access to Settings, configuration, and admin controls." },
];

function buildDefaultValues(item: ReturnType<typeof getConfigurationItem>) {
  if (!item) return {};
  const defaults = Object.fromEntries(
    item.sections.flatMap((entry) =>
      entry.fields.map((field) => [field.id, field.type === "toggle" ? false : field.type === "select" ? field.options[0] : ""]),
    ),
  );
  if (item.slug === "notification") {
    return {
      ...defaults,
      "notify-expiry-warning": true,
      "notify-expiry-days": "5",
    };
  }
  return defaults;
}

function readStoredConfiguration(section?: string) {
  if (!section || typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(`${CONFIG_STORAGE_PREFIX}:${section}`);
    return raw ? (JSON.parse(raw) as Record<string, string | boolean>) : {};
  } catch {
    return {};
  }
}

export function ConfigDetailPage() {
  const { section } = useParams();
  const navigate = useNavigate();
  const item = getConfigurationItem(section);
  const permissionsQuery = usePermissionRoles();
  const updatePermissionRoleMutation = useUpdatePermissionRole();
  const createPrivilegeAccountMutation = useCreatePrivilegeAccount();
  const currentUser = useAppStore((state) => state.user);
  const addMember = useAdminStore((state) => state.addMember);
  const setMembers = useAdminStore((state) => state.setMembers);
  const initialForm = useMemo(
    () => ({ ...buildDefaultValues(item), ...readStoredConfiguration(item?.slug) }),
    [item],
  );
  const [values, setValues] = useState<Record<string, string | boolean>>(initialForm);
  const [accountForm, setAccountForm] = useState<{ fullName: string; email: string; role: MemberRole; permissionProfileId: string }>({
    fullName: "",
    email: "",
    role: "admin",
    permissionProfileId: "",
  });
  const [roleModels, setRoleModels] = useState<Record<string, PrivilegeModel>>({});
  const [profilePermissions, setProfilePermissions] = useState<Record<string, PermissionFlags>>({});
  const canAccessSettings = hasPermission(currentUser, "settings_access");
  const canEditPermissions = canManagePermissions(currentUser);

  useEffect(() => {
    setValues(initialForm);
  }, [initialForm]);

  const saveConfiguration = () => {
    if (!item || typeof window === "undefined") return;
    window.localStorage.setItem(`${CONFIG_STORAGE_PREFIX}:${item.slug}`, JSON.stringify(values));
    toast.success(`${item.label} configuration saved.`);
  };

  useEffect(() => {
    const roles = permissionsQuery.data ?? [];
    setMembers(flattenPermissionMembers(roles));
    setRoleModels(
      Object.fromEntries(roles.map((role) => [role.id, (role.privilegeModel ?? "Role Based") as PrivilegeModel])),
    );
    setProfilePermissions(Object.fromEntries(roles.map((role) => [role.id, role.permissions])));
      setAccountForm((current) => ({
        ...current,
        permissionProfileId: current.permissionProfileId || roles[0]?.id || "",
      }));
  }, [permissionsQuery.data, setMembers]);

  if (!item) {
    return <Navigate to="/settings/configuration" replace />;
  }

  if (!canAccessSettings) {
    return (
      <SettingsLayout activeTab="configuration" summary={item.label}>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Your permission profile does not allow access to Settings.
          </CardContent>
        </Card>
      </SettingsLayout>
    );
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
                  <CardTitle>Permission Profiles</CardTitle>
                  <CardDescription>Control profile permissions globally and keep each member tied to a single permission profile.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {permissionRoles.map((role) => (
                    <div key={role.id} className="rounded-xl border border-border/70 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-1">
                          <p className="font-medium">{role.name}</p>
                          <p className="text-sm text-muted-foreground">{role.description}</p>
                          <p className="text-xs text-muted-foreground">
                            Scope: {role.scope} | Members: {role.members?.length ?? role.memberCount}
                          </p>
                        </div>
                        <div className="flex w-full flex-col gap-2 lg:w-64">
                          <Select
                            value={roleModels[role.id] ?? role.privilegeModel ?? "Role Based"}
                            disabled={!canEditPermissions}
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
                            disabled={updatePermissionRoleMutation.isPending || !canEditPermissions}
                            onClick={() =>
                              updatePermissionRoleMutation.mutate({
                                id: role.id,
                                payload: {
                                  privilegeModel: roleModels[role.id] ?? role.privilegeModel ?? "Role Based",
                                  permissions: profilePermissions[role.id] ?? role.permissions,
                                },
                              })
                            }
                          >
                            Save Profile
                          </Button>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {permissionFields.map((field) => (
                          <div key={field.key} className="rounded-lg border border-border/70 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium">{field.label}</p>
                                <p className="mt-1 text-xs text-muted-foreground">{field.helper}</p>
                              </div>
                              <Switch
                                checked={Boolean((profilePermissions[role.id] ?? role.permissions)[field.key])}
                                disabled={!canEditPermissions}
                                onCheckedChange={(checked) =>
                                  setProfilePermissions((current) => ({
                                    ...current,
                                    [role.id]: {
                                      ...(current[role.id] ?? role.permissions),
                                      [field.key]: checked,
                                    },
                                  }))
                                }
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      {(role.members ?? []).length > 0 ? (
                        <div className="mt-3 rounded-lg bg-muted/30 p-3">
                          <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Assigned Members</p>
                          <div className="space-y-1">
                            {(role.members ?? []).map((member) => (
                              <p key={member.id} className="text-sm">
                                {member.fullName} <span className="text-muted-foreground">({member.role} | {member.email})</span>
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
                  <CardTitle>Create Member</CardTitle>
                  <CardDescription>Assign a new member directly into an existing permission profile.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="admin-member-name">Full Name</Label>
                    <Input
                      id="admin-member-name"
                      value={accountForm.fullName}
                      onChange={(event) => setAccountForm((current) => ({ ...current, fullName: event.target.value }))}
                      placeholder="Operations Manager"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="admin-member-email">Email</Label>
                    <Input
                      id="admin-member-email"
                      type="email"
                      value={accountForm.email}
                      onChange={(event) => setAccountForm((current) => ({ ...current, email: event.target.value }))}
                      placeholder="ops.manager@westlink.io"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="admin-member-role">Assigned Role</Label>
                    <Select
                      id="admin-member-role"
                      value={accountForm.role}
                      onChange={(event) => setAccountForm((current) => ({ ...current, role: event.target.value as MemberRole }))}
                    >
                      <option value="admin">admin</option>
                      <option value="support">support</option>
                      <option value="noc">noc</option>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="admin-member-profile">Permission Profile</Label>
                    <Select
                      id="admin-member-profile"
                      value={accountForm.permissionProfileId}
                      disabled={!canEditPermissions}
                      onChange={(event) => setAccountForm((current) => ({ ...current, permissionProfileId: event.target.value }))}
                    >
                      <option value="">Select profile</option>
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
                      !canEditPermissions ||
                      createPrivilegeAccountMutation.isPending ||
                      !accountForm.fullName.trim() ||
                      !accountForm.email.trim() ||
                      !accountForm.role.trim() ||
                      !accountForm.permissionProfileId
                    }
                    onClick={() =>
                      createPrivilegeAccountMutation.mutate(
                        {
                          fullName: accountForm.fullName,
                          email: accountForm.email,
                          role: accountForm.role,
                          permissionProfileId: accountForm.permissionProfileId,
                        },
                        {
                          onSuccess: (member) => {
                            addMember(member);
                            setAccountForm({
                              fullName: "",
                              email: "",
                              role: "admin",
                              permissionProfileId: permissionRoles[0]?.id ?? "",
                            });
                          },
                        },
                      )
                    }
                  >
                    {createPrivilegeAccountMutation.isPending ? "Creating..." : "Create Member"}
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
              {item.slug === "notification" ? (
                <div className="rounded-xl border border-border/70 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">Expiration Notification</p>
                      <p className="text-sm text-muted-foreground">
                        Expiry notifications will send before entered days and on the expiry date.
                      </p>
                    </div>
                    <div className="flex items-start gap-4">
                      <Switch
                        checked={Boolean(values["notify-expiry-warning"])}
                        onCheckedChange={(checked) => setValues((current) => ({ ...current, "notify-expiry-warning": checked }))}
                      />
                      <div className="w-28 space-y-1">
                        <Label htmlFor="notify-expiry-days">Days</Label>
                        <Input
                          id="notify-expiry-days"
                          type="number"
                          min="1"
                          value={String(values["notify-expiry-days"] ?? "5")}
                          onChange={(event) =>
                            setValues((current) => ({
                              ...current,
                              "notify-expiry-days": event.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
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
                <Button type="button" onClick={saveConfiguration}>
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
