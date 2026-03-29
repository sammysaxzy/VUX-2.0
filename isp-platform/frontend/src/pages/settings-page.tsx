import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { NasEntry, ServicePlan, SettingsTab } from "@/types";
import {
  useCreateNasEntry,
  useCreateServicePlan,
  useCreateZone,
  useDeleteNasEntries,
  useDeletePermissionRoles,
  useDeleteServicePlans,
  useDeleteSettingsLogs,
  useDeleteZones,
  useNasEntries,
  usePermissionRoles,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatRelativeDate } from "@/lib/utils";

const blankNasForm = { name: "", ipAddress: "", sharedSecret: "" };
const blankZoneForm = { name: "", nasId: "", description: "" };
const blankServiceForm: ServicePlan = { name: "", speed: "", price: "", rateLimit: "", description: "" };

type SettingsDeleteTarget = "nas" | "zones" | "permissions" | "services" | "logs";

function toggleSelection(values: string[], id: string) {
  return values.includes(id) ? values.filter((entry) => entry !== id) : [...values, id];
}

function toggleSelectAll(values: string[], ids: string[]) {
  const allSelected = ids.length > 0 && ids.every((id) => values.includes(id));
  if (allSelected) {
    return values.filter((id) => !ids.includes(id));
  }
  return [...new Set([...values, ...ids])];
}

export function SettingsPage() {
  const [searchParams] = useSearchParams();
  const [nasModalOpen, setNasModalOpen] = useState(false);
  const [editingNas, setEditingNas] = useState<NasEntry | null>(null);
  const [nasForm, setNasForm] = useState(blankNasForm);
  const [zoneForm, setZoneForm] = useState(blankZoneForm);
  const [serviceForm, setServiceForm] = useState<ServicePlan>(blankServiceForm);
  const [selectedNasIds, setSelectedNasIds] = useState<string[]>([]);
  const [selectedZoneIds, setSelectedZoneIds] = useState<string[]>([]);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);
  const [selectedServiceNames, setSelectedServiceNames] = useState<string[]>([]);
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<SettingsDeleteTarget | null>(null);

  const nasQuery = useNasEntries();
  const createNasMutation = useCreateNasEntry();
  const deleteNasMutation = useDeleteNasEntries();
  const updateNasMutation = useUpdateNasEntry();
  const zonesQuery = useZones();
  const createZoneMutation = useCreateZone();
  const deleteZonesMutation = useDeleteZones();
  const permissionsQuery = usePermissionRoles();
  const deletePermissionsMutation = useDeletePermissionRoles();
  const servicesQuery = useServicePlans();
  const createServiceMutation = useCreateServicePlan();
  const deleteServicesMutation = useDeleteServicePlans();
  const logsQuery = useSettingsLogs();
  const deleteLogsMutation = useDeleteSettingsLogs();

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

  const nasIds = useMemo(() => nasQuery.data?.map((entry) => entry.id) ?? [], [nasQuery.data]);
  const zoneIds = useMemo(() => zonesQuery.data?.map((zone) => zone.id) ?? [], [zonesQuery.data]);
  const permissionIds = useMemo(() => permissionsQuery.data?.map((role) => role.id) ?? [], [permissionsQuery.data]);
  const serviceNames = useMemo(() => servicesQuery.data?.map((plan) => plan.name) ?? [], [servicesQuery.data]);
  const logIds = useMemo(() => logsQuery.data?.map((log) => log.id) ?? [], [logsQuery.data]);

  useEffect(() => {
    setSelectedNasIds((current) => current.filter((id) => nasIds.includes(id)));
    setSelectedZoneIds((current) => current.filter((id) => zoneIds.includes(id)));
    setSelectedPermissionIds((current) => current.filter((id) => permissionIds.includes(id)));
    setSelectedServiceNames((current) => current.filter((name) => serviceNames.includes(name)));
    setSelectedLogIds((current) => current.filter((id) => logIds.includes(id)));
  }, [logIds, nasIds, permissionIds, serviceNames, zoneIds]);

  const deleteCount =
    deleteTarget === "nas"
      ? selectedNasIds.length
      : deleteTarget === "zones"
      ? selectedZoneIds.length
      : deleteTarget === "permissions"
      ? selectedPermissionIds.length
      : deleteTarget === "services"
      ? selectedServiceNames.length
      : deleteTarget === "logs"
      ? selectedLogIds.length
      : 0;

  const confirmDelete = () => {
    if (deleteTarget === "nas" && selectedNasIds.length > 0) {
      deleteNasMutation.mutate(selectedNasIds, {
        onSuccess: () => {
          setSelectedNasIds([]);
          setDeleteTarget(null);
        },
      });
      return;
    }
    if (deleteTarget === "zones" && selectedZoneIds.length > 0) {
      deleteZonesMutation.mutate(selectedZoneIds, {
        onSuccess: () => {
          setSelectedZoneIds([]);
          setDeleteTarget(null);
        },
      });
      return;
    }
    if (deleteTarget === "permissions" && selectedPermissionIds.length > 0) {
      deletePermissionsMutation.mutate(selectedPermissionIds, {
        onSuccess: () => {
          setSelectedPermissionIds([]);
          setDeleteTarget(null);
        },
      });
      return;
    }
    if (deleteTarget === "services" && selectedServiceNames.length > 0) {
      deleteServicesMutation.mutate(selectedServiceNames, {
        onSuccess: () => {
          setSelectedServiceNames([]);
          setDeleteTarget(null);
        },
      });
      return;
    }
    if (deleteTarget === "logs" && selectedLogIds.length > 0) {
      deleteLogsMutation.mutate(selectedLogIds, {
        onSuccess: () => {
          setSelectedLogIds([]);
          setDeleteTarget(null);
        },
      });
    }
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
                <div className="flex items-center gap-2">
                  <Button type="button" variant="danger" disabled={selectedNasIds.length === 0} onClick={() => setDeleteTarget("nas")}>
                    Delete
                  </Button>
                  <Button type="button" onClick={openCreateNas}>
                    Add NAS
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          checked={nasIds.length > 0 && nasIds.every((id) => selectedNasIds.includes(id))}
                          onChange={() => setSelectedNasIds((current) => toggleSelectAll(current, nasIds))}
                          aria-label="Select all NAS entries"
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Shared Secret</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nasQuery.data.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedNasIds.includes(entry.id)}
                            onChange={() => setSelectedNasIds((current) => toggleSelection(current, entry.id))}
                            aria-label={`Select ${entry.name}`}
                          />
                        </TableCell>
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
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Zone Management</CardTitle>
                  <CardDescription>Bind each PPPoE zone to a NAS so authentication is routed through the correct core router.</CardDescription>
                </div>
                <Button type="button" variant="danger" disabled={selectedZoneIds.length === 0} onClick={() => setDeleteTarget("zones")}>
                  Delete
                </Button>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          checked={zoneIds.length > 0 && zoneIds.every((id) => selectedZoneIds.includes(id))}
                          onChange={() => setSelectedZoneIds((current) => toggleSelectAll(current, zoneIds))}
                          aria-label="Select all zones"
                        />
                      </TableHead>
                      <TableHead>Zone</TableHead>
                      <TableHead>NAS</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Users</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {zonesQuery.data.map((zone) => (
                      <TableRow key={zone.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedZoneIds.includes(zone.id)}
                            onChange={() => setSelectedZoneIds((current) => toggleSelection(current, zone.id))}
                            aria-label={`Select ${zone.name}`}
                          />
                        </TableCell>
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Permissions</CardTitle>
                <CardDescription>Role-based access control across OSS/BSS operational domains.</CardDescription>
              </div>
              <Button type="button" variant="danger" disabled={selectedPermissionIds.length === 0} onClick={() => setDeleteTarget("permissions")}>
                Delete
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        checked={permissionIds.length > 0 && permissionIds.every((id) => selectedPermissionIds.includes(id))}
                        onChange={() => setSelectedPermissionIds((current) => toggleSelectAll(current, permissionIds))}
                        aria-label="Select all permissions"
                      />
                    </TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Privilege Model</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Accounts</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Members</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissionsQuery.data.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedPermissionIds.includes(role.id)}
                          onChange={() => setSelectedPermissionIds((current) => toggleSelection(current, role.id))}
                          aria-label={`Select ${role.name}`}
                        />
                      </TableCell>
                      <TableCell>{role.name}</TableCell>
                      <TableCell>{role.privilegeModel ?? "Role Based"}</TableCell>
                      <TableCell>{role.scope}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {(role.accounts ?? []).slice(0, 2).map((account) => (
                            <p key={account.id} className="text-xs">
                              {account.fullName}
                            </p>
                          ))}
                          {(role.accounts ?? []).length > 2 ? (
                            <p className="text-xs text-muted-foreground">+{(role.accounts ?? []).length - 2} more</p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{role.description}</TableCell>
                      <TableCell>{role.accounts?.length ?? role.memberCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}

      {activeTab === "services" &&
        (servicesQuery.isLoading || !servicesQuery.data ? (
          <PageSkeleton />
        ) : (
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Services</CardTitle>
                  <CardDescription>Shared bandwidth plans consumed by RADIUS through radreply.</CardDescription>
                </div>
                <Button type="button" variant="danger" disabled={selectedServiceNames.length === 0} onClick={() => setDeleteTarget("services")}>
                  Delete
                </Button>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          checked={serviceNames.length > 0 && serviceNames.every((name) => selectedServiceNames.includes(name))}
                          onChange={() => setSelectedServiceNames((current) => toggleSelectAll(current, serviceNames))}
                          aria-label="Select all services"
                        />
                      </TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Speed</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Rate Limit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {servicesQuery.data.map((plan) => (
                      <TableRow key={plan.name}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedServiceNames.includes(plan.name)}
                            onChange={() => setSelectedServiceNames((current) => toggleSelection(current, plan.name))}
                            aria-label={`Select ${plan.name}`}
                          />
                        </TableCell>
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
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Logs</CardTitle>
                <CardDescription>Authentication, disconnect, and sync events across shared service operations.</CardDescription>
              </div>
              <Button type="button" variant="danger" disabled={selectedLogIds.length === 0} onClick={() => setDeleteTarget("logs")}>
                Delete
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        checked={logIds.length > 0 && logIds.every((id) => selectedLogIds.includes(id))}
                        onChange={() => setSelectedLogIds((current) => toggleSelectAll(current, logIds))}
                        aria-label="Select all logs"
                      />
                    </TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsQuery.data.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedLogIds.includes(log.id)}
                          onChange={() => setSelectedLogIds((current) => toggleSelection(current, log.id))}
                          aria-label={`Select log ${log.id}`}
                        />
                      </TableCell>
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
        open={deleteTarget !== null}
        title="Delete Selected Items"
        description={`Are you sure you want to delete ${deleteCount} selected item${deleteCount === 1 ? "" : "s"}?`}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={
              deleteCount === 0 ||
              deleteNasMutation.isPending ||
              deleteZonesMutation.isPending ||
              deletePermissionsMutation.isPending ||
              deleteServicesMutation.isPending ||
              deleteLogsMutation.isPending
            }
            onClick={confirmDelete}
          >
            {deleteNasMutation.isPending ||
            deleteZonesMutation.isPending ||
            deletePermissionsMutation.isPending ||
            deleteServicesMutation.isPending ||
            deleteLogsMutation.isPending
              ? "Deleting..."
              : "Confirm Delete"}
          </Button>
        </div>
      </Dialog>

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
