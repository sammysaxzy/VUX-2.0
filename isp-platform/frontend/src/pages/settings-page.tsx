import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { NasEntry, ServicePlan, SettingsTab } from "@/types";
import {
  useCreateNasEntry,
  useCreateServicePlan,
  useCreateZone,
  useNasEntries,
  usePermissionRoles,
  useSavePermissionMemberAccess,
  useServicePlans,
  useSettingsLogs,
  useUpdateNasEntry,
  useZones,
} from "@/hooks/api/use-settings";
import { Button } from "@/components/ui/button";
import { SettingsLayout } from "@/components/settings/settings-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { resolveMapAccess } from "@/lib/map-permissions";
import { formatRelativeDate } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import type { MapAccessRole, PermissionMember } from "@/types";

const blankNasForm = { name: "", ipAddress: "", sharedSecret: "" };
const blankZoneForm = { name: "", nasId: "", description: "" };
const blankServiceForm: ServicePlan = { name: "", speed: "", price: "", rateLimit: "", description: "" };
const blankPermissionForm: { fullName: string; email: string; mapRole: MapAccessRole; canDelete: boolean } = {
  fullName: "",
  email: "",
  mapRole: "viewer",
  canDelete: false,
};

export function SettingsPage() {
  const [searchParams] = useSearchParams();
  const currentUser = useAppStore((state) => state.user);
  const [nasModalOpen, setNasModalOpen] = useState(false);
  const [editingNas, setEditingNas] = useState<NasEntry | null>(null);
  const [nasForm, setNasForm] = useState(blankNasForm);
  const [zoneForm, setZoneForm] = useState(blankZoneForm);
  const [serviceForm, setServiceForm] = useState<ServicePlan>(blankServiceForm);
  const [permissionForm, setPermissionForm] = useState(blankPermissionForm);

  const nasQuery = useNasEntries();
  const createNasMutation = useCreateNasEntry();
  const updateNasMutation = useUpdateNasEntry();
  const zonesQuery = useZones();
  const createZoneMutation = useCreateZone();
  const permissionsQuery = usePermissionRoles();
  const savePermissionMemberAccess = useSavePermissionMemberAccess();
  const servicesQuery = useServicePlans();
  const createServiceMutation = useCreateServicePlan();
  const logsQuery = useSettingsLogs();
  const permissionAccess = useMemo(
    () => resolveMapAccess(currentUser, permissionsQuery.data ?? []),
    [currentUser, permissionsQuery.data],
  );

  const activeTab = useMemo<SettingsTab>(() => {
    const requestedTab = searchParams.get("tab");
    if (requestedTab === "zones" || requestedTab === "permissions" || requestedTab === "services" || requestedTab === "logs") {
      return requestedTab;
    }
    return "nas";
  }, [searchParams]);

  const nasBusy = createNasMutation.isPending || updateNasMutation.isPending;
  const nasCount = nasQuery.data?.length ?? 0;
  const zoneCount = zonesQuery.data?.length ?? 0;
  const serviceCount = servicesQuery.data?.length ?? 0;
  const logCount = logsQuery.data?.length ?? 0;

  const activeSummary = useMemo(() => {
    if (activeTab === "nas") return `${nasCount} NAS devices`;
    if (activeTab === "zones") return `${zoneCount} active zones`;
    if (activeTab === "permissions") return `${permissionsQuery.data?.length ?? 0} access roles`;
    if (activeTab === "services") return `${serviceCount} bandwidth services`;
    return `${logCount} audit events`;
  }, [activeTab, logCount, nasCount, permissionsQuery.data?.length, serviceCount, zoneCount]);

  const openCreateNas = () => {
    setEditingNas(null);
    setNasForm(blankNasForm);
    setNasModalOpen(true);
  };

  const openEditNas = (entry: NasEntry) => {
    setEditingNas(entry);
    setNasForm({ name: entry.name, ipAddress: entry.ipAddress, sharedSecret: entry.sharedSecret });
    setNasModalOpen(true);
  };

  const saveNas = () => {
    if (!nasForm.name.trim() || !nasForm.ipAddress.trim() || !nasForm.sharedSecret.trim()) return;
    if (editingNas) {
      updateNasMutation.mutate(
        { id: editingNas.id, payload: nasForm },
        {
          onSuccess: () => {
            setNasModalOpen(false);
            setEditingNas(null);
            setNasForm(blankNasForm);
          },
        },
      );
      return;
    }

    createNasMutation.mutate(nasForm, {
      onSuccess: () => {
        setNasModalOpen(false);
        setNasForm(blankNasForm);
      },
    });
  };

  const saveZone = () => {
    if (!zoneForm.name.trim() || !zoneForm.nasId.trim() || !zoneForm.description.trim()) return;
    createZoneMutation.mutate(zoneForm, {
      onSuccess: () => setZoneForm(blankZoneForm),
    });
  };

  const saveService = () => {
    if (!serviceForm.name.trim() || !serviceForm.speed.trim() || !serviceForm.price.trim() || !serviceForm.rateLimit.trim()) return;
    createServiceMutation.mutate(serviceForm, {
      onSuccess: () => setServiceForm(blankServiceForm),
    });
  };

  const savePermissionMember = () => {
    if (!permissionForm.fullName.trim() || !permissionForm.email.trim()) return;
    savePermissionMemberAccess.mutate(
      {
        member: {
          fullName: permissionForm.fullName.trim(),
          email: permissionForm.email.trim(),
          mapRole: permissionForm.mapRole,
          canDelete: permissionForm.canDelete,
        },
      },
      {
        onSuccess: () => setPermissionForm(blankPermissionForm),
      },
    );
  };

  const updatePermissionMember = (member: PermissionMember, updates: Partial<PermissionMember>) => {
    savePermissionMemberAccess.mutate({
      member: {
        id: member.id,
        userId: member.userId,
        fullName: updates.fullName ?? member.fullName,
        email: updates.email ?? member.email,
        mapRole: updates.mapRole ?? member.mapRole,
        canDelete: updates.canDelete ?? member.canDelete,
      },
    });
  };

  return (
    <SettingsLayout activeTab={activeTab} summary={activeSummary}>

      {activeTab === "nas" &&
        (nasQuery.isLoading || !nasQuery.data ? (
          <PageSkeleton />
        ) : (
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>NAS Management</CardTitle>
                  <CardDescription>Store NAS IP and shared secret centrally for PPPoE access infrastructure.</CardDescription>
                </div>
                <Button type="button" onClick={openCreateNas}>
                  Add NAS
                </Button>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Shared Secret</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nasQuery.data.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{entry.name}</TableCell>
                        <TableCell>{entry.ipAddress}</TableCell>
                        <TableCell>{entry.sharedSecret}</TableCell>
                        <TableCell className="text-right">
                          <Button type="button" size="sm" variant="outline" onClick={() => openEditNas(entry)}>
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        ))}

      {activeTab === "zones" &&
        (zonesQuery.isLoading || !zonesQuery.data ? (
          <PageSkeleton />
        ) : (
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader>
                <CardTitle>Zone Management</CardTitle>
                <CardDescription>Bind each PPPoE zone to a NAS so authentication is routed through the correct core router.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Zone</TableHead>
                      <TableHead>NAS</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Users</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {zonesQuery.data.map((zone) => (
                      <TableRow key={zone.id}>
                        <TableCell>{zone.name}</TableCell>
                        <TableCell>{zone.nasName}</TableCell>
                        <TableCell>{zone.description}</TableCell>
                        <TableCell>{zone.usersCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Create Zone</CardTitle>
                <CardDescription>Create a PPPoE zone and tie it directly to a NAS device.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="zone-name">Zone Name</Label>
                  <Input id="zone-name" value={zoneForm.name} onChange={(event) => setZoneForm((prev) => ({ ...prev, name: event.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="zone-nas">NAS</Label>
                  <Select
                    id="zone-nas"
                    value={zoneForm.nasId}
                    onChange={(event) => setZoneForm((prev) => ({ ...prev, nasId: event.target.value }))}
                  >
                    <option value="">Select NAS</option>
                    {(nasQuery.data ?? []).map((nas) => (
                      <option key={nas.id} value={nas.id}>
                        {nas.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="zone-description">Description</Label>
                  <Input id="zone-description" value={zoneForm.description} onChange={(event) => setZoneForm((prev) => ({ ...prev, description: event.target.value }))} />
                </div>
                <Button type="button" onClick={saveZone} disabled={createZoneMutation.isPending}>
                  {createZoneMutation.isPending ? "Saving..." : "Create Zone"}
                </Button>
              </CardContent>
            </Card>
          </div>
        ))}

      {activeTab === "permissions" &&
        (permissionsQuery.isLoading || !permissionsQuery.data ? (
          <PageSkeleton />
        ) : (
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Map Permissions</CardTitle>
                <CardDescription>
                  Define `ADMIN`, `ENGINEER`, and `VIEWER` access for the fibre deployment map, including delete overrides.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full border border-border px-3 py-1">Current access: {permissionAccess.mapRole.toUpperCase()}</span>
                <span className="rounded-full border border-border px-3 py-1">
                  {permissionAccess.canManagePermissions ? "Can manage permissions" : "Read-only permission view"}
                </span>
              </CardContent>
            </Card>

            {permissionsQuery.data.map((role) => (
              <Card key={role.id}>
                <CardHeader>
                  <CardTitle>{role.name}</CardTitle>
                  <CardDescription>{role.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full border border-border px-2.5 py-1">Scope: {role.scope}</span>
                    <span className="rounded-full border border-border px-2.5 py-1">Members: {role.memberCount}</span>
                    {(role.permissions ?? []).map((permission) => (
                      <span key={`${role.id}-${permission}`} className="rounded-full border border-border px-2.5 py-1">
                        {permission.replace("_", " ")}
                      </span>
                    ))}
                  </div>

                  <div className="space-y-3">
                    {(role.members ?? []).map((member) => (
                      <div key={member.id} className="rounded-xl border border-border/70 bg-background/60 p-3">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <p className="font-medium">{member.fullName}</p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-[180px_auto] sm:items-center">
                            <div className="space-y-1">
                              <Label htmlFor={`map-role-${member.id}`}>Map Role</Label>
                              <Select
                                id={`map-role-${member.id}`}
                                value={member.mapRole}
                                disabled={!permissionAccess.canManagePermissions || savePermissionMemberAccess.isPending}
                                onChange={(event) =>
                                  updatePermissionMember(member, { mapRole: event.target.value as MapAccessRole })
                                }
                              >
                                <option value="admin">ADMIN</option>
                                <option value="engineer">ENGINEER</option>
                                <option value="viewer">VIEWER</option>
                              </Select>
                            </div>
                            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2">
                              <div>
                                <p className="text-sm font-medium">Delete privilege</p>
                                <p className="text-xs text-muted-foreground">Allow this user to delete map objects.</p>
                              </div>
                              <Switch
                                checked={member.canDelete}
                                onCheckedChange={(checked) => updatePermissionMember(member, { canDelete: checked })}
                                className={!permissionAccess.canManagePermissions ? "pointer-events-none opacity-60" : ""}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(role.members ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No team member is assigned to this role yet.</p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}

            <Card>
              <CardHeader>
                <CardTitle>Grant Map Access</CardTitle>
                <CardDescription>Add or update a team member's map role and delete permission.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="permission-name">Full Name</Label>
                    <Input
                      id="permission-name"
                      value={permissionForm.fullName}
                      disabled={!permissionAccess.canManagePermissions}
                      onChange={(event) => setPermissionForm((prev) => ({ ...prev, fullName: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="permission-email">Email</Label>
                    <Input
                      id="permission-email"
                      type="email"
                      value={permissionForm.email}
                      disabled={!permissionAccess.canManagePermissions}
                      onChange={(event) => setPermissionForm((prev) => ({ ...prev, email: event.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-[200px_auto] md:items-center">
                  <div className="space-y-1">
                    <Label htmlFor="permission-role">Map Role</Label>
                    <Select
                      id="permission-role"
                      value={permissionForm.mapRole}
                      disabled={!permissionAccess.canManagePermissions}
                      onChange={(event) =>
                        setPermissionForm((prev) => ({ ...prev, mapRole: event.target.value as MapAccessRole }))
                      }
                    >
                      <option value="admin">ADMIN</option>
                      <option value="engineer">ENGINEER</option>
                      <option value="viewer">VIEWER</option>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">Allow delete actions</p>
                      <p className="text-xs text-muted-foreground">Grant delete access for MST, closure, fibre, cabinet, ODF, and client drops.</p>
                    </div>
                    <Switch
                      checked={permissionForm.canDelete}
                      onCheckedChange={(checked) => setPermissionForm((prev) => ({ ...prev, canDelete: checked }))}
                      className={!permissionAccess.canManagePermissions ? "pointer-events-none opacity-60" : ""}
                    />
                  </div>
                </div>
                <Button type="button" disabled={!permissionAccess.canManagePermissions || savePermissionMemberAccess.isPending} onClick={savePermissionMember}>
                  {savePermissionMemberAccess.isPending ? "Saving..." : "Grant Access"}
                </Button>
              </CardContent>
            </Card>
          </div>
        ))}

      {activeTab === "services" &&
        (servicesQuery.isLoading || !servicesQuery.data ? (
          <PageSkeleton />
        ) : (
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader>
                <CardTitle>Services</CardTitle>
                <CardDescription>Shared bandwidth plans consumed by RADIUS through radreply.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan</TableHead>
                      <TableHead>Speed</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Rate Limit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {servicesQuery.data.map((plan) => (
                      <TableRow key={plan.name}>
                        <TableCell>{plan.name}</TableCell>
                        <TableCell>{plan.speed}</TableCell>
                        <TableCell>{plan.price}</TableCell>
                        <TableCell>{plan.rateLimit}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Create Bandwidth Plan</CardTitle>
                <CardDescription>These plans remain shared globally and are selectable from RADIUS.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="service-name">Plan Name</Label>
                  <Input id="service-name" value={serviceForm.name} onChange={(event) => setServiceForm((prev) => ({ ...prev, name: event.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="service-speed">Speed</Label>
                  <Input id="service-speed" value={serviceForm.speed} onChange={(event) => setServiceForm((prev) => ({ ...prev, speed: event.target.value }))} placeholder="50M/50M" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="service-price">Price</Label>
                  <Input id="service-price" value={serviceForm.price} onChange={(event) => setServiceForm((prev) => ({ ...prev, price: event.target.value }))} placeholder="N18,900" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="service-rate-limit">Rate Limit</Label>
                  <Input id="service-rate-limit" value={serviceForm.rateLimit} onChange={(event) => setServiceForm((prev) => ({ ...prev, rateLimit: event.target.value }))} placeholder="50M/50M" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="service-description">Description</Label>
                  <Input id="service-description" value={serviceForm.description ?? ""} onChange={(event) => setServiceForm((prev) => ({ ...prev, description: event.target.value }))} />
                </div>
                <Button type="button" onClick={saveService} disabled={createServiceMutation.isPending}>
                  {createServiceMutation.isPending ? "Saving..." : "Create Plan"}
                </Button>
              </CardContent>
            </Card>
          </div>
        ))}

      {activeTab === "logs" &&
        (logsQuery.isLoading || !logsQuery.data ? (
          <PageSkeleton />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Logs</CardTitle>
              <CardDescription>Authentication, disconnect, and sync events across shared service operations.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsQuery.data.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="capitalize">{log.type}</TableCell>
                      <TableCell>{log.actor}</TableCell>
                      <TableCell>{log.description}</TableCell>
                      <TableCell>{formatRelativeDate(log.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}

      <Dialog
        open={nasModalOpen}
        title={editingNas ? "Edit NAS" : "Add NAS"}
        description="Maintain NAS IP and shared secret from global Settings."
        onOpenChange={setNasModalOpen}
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="nas-name">Name</Label>
            <Input id="nas-name" value={nasForm.name} onChange={(event) => setNasForm((prev) => ({ ...prev, name: event.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="nas-ip">IP Address</Label>
            <Input id="nas-ip" value={nasForm.ipAddress} onChange={(event) => setNasForm((prev) => ({ ...prev, ipAddress: event.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="nas-secret">Shared Secret</Label>
            <Input id="nas-secret" value={nasForm.sharedSecret} onChange={(event) => setNasForm((prev) => ({ ...prev, sharedSecret: event.target.value }))} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setNasModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={saveNas} disabled={nasBusy}>
              {nasBusy ? "Saving..." : editingNas ? "Update NAS" : "Add NAS"}
            </Button>
          </div>
        </div>
      </Dialog>
    </SettingsLayout>
  );
}
