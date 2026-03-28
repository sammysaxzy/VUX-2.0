"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { CustomerType, PriorityLevel, RadiusTab } from "@/types";
import {
  useActivateRadiusUser,
  useBulkImportRadiusUsers,
  useCreateRadiusUser,
  useDisconnectSession,
  useExtendRadiusUser,
  useExportRadiusSessions,
  useExportRadiusUsers,
  useRadiusSessions,
  useRadiusUsers,
  useReconnectSession,
  useSyncRadiusUser,
} from "@/hooks/api/use-radius";
import { useNasEntries, useServicePlans, useZones } from "@/hooks/api/use-settings";
import { ExportButton } from "@/components/import-export/export-button";
import { ImportModal } from "@/components/import-export/import-modal";
import { useRadiusRealtime } from "@/hooks/use-radius-realtime";
import { RadiusSessionTable } from "@/components/radius/radius-session-table";
import { RadiusTabs } from "@/components/radius/radius-tabs";
import { UsersTable } from "@/components/radius/users-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Select } from "@/components/ui/select";
import {
  RADIUS_SESSION_EXPORT_SCHEMA,
  RADIUS_USER_IMPORT_EXPORT_SCHEMA,
} from "@/features/import-export/schema";
import { downloadBlob, normalizeExportBlob, mapRadiusUsersToExportRows, mapSessionsToExportRows } from "@/features/import-export/utils";
import { toDateTimeLocalValue } from "@/lib/utils";

type RadiusUserForm = {
  username: string;
  password: string;
  plan: string;
  zoneId: string;
  customerType: CustomerType | "";
  expirationDate: string;
  staticIp: string;
  priority: PriorityLevel | "";
  slaProfile: string;
};

const baseForm: RadiusUserForm = {
  username: "",
  password: "",
  plan: "",
  zoneId: "",
  customerType: "",
  expirationDate: "",
  staticIp: "",
  priority: "",
  slaProfile: "",
};

export function RadiusPage() {
  const [activeTab, setActiveTab] = useState<RadiusTab>("sessions");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [extendModal, setExtendModal] = useState<{ username: string; expirationDate: string } | null>(null);
  const [newUser, setNewUser] = useState<RadiusUserForm>(baseForm);
  const [now, setNow] = useState(() => Date.now());

  const sessionsQuery = useRadiusSessions();
  const disconnectMutation = useDisconnectSession();
  const reconnectMutation = useReconnectSession();
  const extendUserMutation = useExtendRadiusUser();
  const usersQuery = useRadiusUsers();
  const servicesQuery = useServicePlans();
  const zonesQuery = useZones();
  const nasQuery = useNasEntries();
  const createUserMutation = useCreateRadiusUser();
  const bulkImportMutation = useBulkImportRadiusUsers();
  const activateUserMutation = useActivateRadiusUser();
  const syncUserMutation = useSyncRadiusUser();
  const exportUsersMutation = useExportRadiusUsers();
  const exportSessionsMutation = useExportRadiusSessions();

  useRadiusRealtime();

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const serviceOptions = useMemo(() => servicesQuery.data ?? [], [servicesQuery.data]);
  const availablePlans = useMemo(() => {
    if (newUser.customerType === "individual") {
      return serviceOptions.filter((plan) => !/enterprise|50\/50/i.test(`${plan.name} ${plan.description ?? ""}`));
    }
    return serviceOptions;
  }, [newUser.customerType, serviceOptions]);
  const filteredUsers = useMemo(() => {
    const users = usersQuery.data ?? [];
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => user.username.toLowerCase().includes(query));
  }, [search, usersQuery.data]);
  const validNasIds = useMemo(() => (nasQuery.data ?? []).map((entry) => entry.id), [nasQuery.data]);
  const existingUsernames = useMemo(() => (usersQuery.data ?? []).map((user) => user.username), [usersQuery.data]);

  useEffect(() => {
    if (!serviceOptions.length) return;
    setNewUser((current) => ({
      ...current,
      plan: current.plan || serviceOptions[0]?.name || "",
      zoneId: current.zoneId || zonesQuery.data?.[0]?.id || "",
    }));
  }, [serviceOptions, zonesQuery.data]);

  useEffect(() => {
    setNewUser((current) => {
      const nextPlan = availablePlans.some((plan) => plan.name === current.plan) ? current.plan : availablePlans[0]?.name ?? "";
      if (current.customerType === "individual") {
        return {
          ...current,
          plan: nextPlan,
          staticIp: "",
          priority: "",
          slaProfile: "",
        };
      }
      return { ...current, plan: nextPlan };
    });
  }, [availablePlans]);

  useEffect(() => {
    if (!createUserMutation.isSuccess) return;
    setNewUser({
      ...baseForm,
      plan: availablePlans[0]?.name ?? serviceOptions[0]?.name ?? "",
      zoneId: zonesQuery.data?.[0]?.id ?? "",
    });
    setCreateOpen(false);
    createUserMutation.reset();
  }, [availablePlans, createUserMutation, serviceOptions, zonesQuery.data]);

  const selectedZone = useMemo(
    () => (zonesQuery.data ?? []).find((zone) => zone.id === newUser.zoneId),
    [newUser.zoneId, zonesQuery.data],
  );
  const selectedNasEntry = useMemo(
    () => (nasQuery.data ?? []).find((entry) => entry.id === selectedZone?.nasId),
    [nasQuery.data, selectedZone?.nasId],
  );
  const minDateTime = useMemo(() => toDateTimeLocalValue(new Date(now + 60_000).toISOString()), [now]);
  const hasValidExpirationDate =
    Boolean(newUser.expirationDate) && new Date(newUser.expirationDate).getTime() > now;

  const canCreateUser =
    Boolean(newUser.username.trim()) &&
    Boolean(newUser.password.trim()) &&
    Boolean(newUser.plan.trim()) &&
    Boolean(newUser.zoneId.trim()) &&
    Boolean(newUser.customerType) &&
    hasValidExpirationDate;

  const handleCreateUser = () => {
    if (!newUser.username.trim() || !newUser.password.trim() || !newUser.plan.trim() || !newUser.zoneId.trim()) {
      toast.error("Fill in the required PPPoE fields.");
      return;
    }
    if (!newUser.customerType) {
      toast.error("Select a customer type.");
      return;
    }
    if (!hasValidExpirationDate) {
      toast.error("Choose a future expiration date and time.");
      return;
    }

    createUserMutation.mutate({
      username: newUser.username,
      password: newUser.password,
      plan: newUser.plan,
      zoneId: newUser.zoneId,
      customerType: newUser.customerType as CustomerType,
      expirationDate: new Date(newUser.expirationDate).toISOString(),
      staticIp: newUser.customerType === "corporate" ? newUser.staticIp.trim() || undefined : undefined,
      priority: newUser.customerType === "corporate" ? newUser.priority || undefined : undefined,
      slaProfile: newUser.customerType === "corporate" ? newUser.slaProfile.trim() || undefined : undefined,
    });
  };

  const handleExportUsers = async () => {
    const blob = await exportUsersMutation.mutateAsync();
    const normalized = await normalizeExportBlob(
      blob,
      RADIUS_USER_IMPORT_EXPORT_SCHEMA,
      mapRadiusUsersToExportRows(usersQuery.data ?? []),
    );
    downloadBlob("radius-users-export.csv", normalized);
  };

  const handleExportSessions = async () => {
    const blob = await exportSessionsMutation.mutateAsync();
    const normalized = await normalizeExportBlob(
      blob,
      RADIUS_SESSION_EXPORT_SCHEMA,
      mapSessionsToExportRows(sessionsQuery.data ?? []),
    );
    downloadBlob("radius-sessions-export.csv", normalized);
  };

  return (
    <div className="space-y-4 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold">RADIUS Session Control</h1>
        <p className="text-sm text-muted-foreground">
          Manage PPPoE sessions and PPPoE users without coupling RADIUS operations to global service configuration.
        </p>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <RadiusTabs value={activeTab} onChange={setActiveTab} />

        <div className="flex flex-col gap-2 sm:flex-row">
          {activeTab === "users" ? (
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search username" />
          ) : null}
          {activeTab === "users" ? (
            <>
              <Button type="button" variant="outline" onClick={() => setImportOpen(true)}>
                Import
              </Button>
              <ExportButton label="Export" isLoading={exportUsersMutation.isPending} onClick={() => void handleExportUsers()} />
            </>
          ) : (
            <ExportButton
              label="Export"
              isLoading={exportSessionsMutation.isPending}
              onClick={() => void handleExportSessions()}
            />
          )}
          {activeTab === "sessions" ? (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              Create PPPoE
            </Button>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        {activeTab === "sessions" &&
          (sessionsQuery.isLoading || !sessionsQuery.data ? (
            <PageSkeleton />
          ) : (
            <RadiusSessionTable
              sessions={sessionsQuery.data}
              onDisconnect={(username) => disconnectMutation.mutate(username)}
              onReconnect={(username) => reconnectMutation.mutate(username)}
              busyDisconnect={disconnectMutation.variables}
              busyReconnect={reconnectMutation.variables}
              now={now}
            />
          ))}

        {activeTab === "users" &&
          (usersQuery.isLoading || servicesQuery.isLoading || zonesQuery.isLoading || nasQuery.isLoading || !usersQuery.data ? (
            <PageSkeleton />
          ) : (
            <div className="space-y-4">
              <UsersTable
                users={filteredUsers}
                onActivate={(username) => activateUserMutation.mutate(username)}
                onSync={(username) => syncUserMutation.mutate(username)}
                onExtend={(username) => {
                  const target = filteredUsers.find((user) => user.username === username);
                  if (!target) return;
                  setExtendModal({ username, expirationDate: toDateTimeLocalValue(target.expirationDate) });
                }}
                busyActivate={activateUserMutation.variables}
                busySync={syncUserMutation.variables}
                busyExtend={extendUserMutation.variables?.username}
                now={now}
              />

              <Card>
                <CardHeader className="flex flex-col gap-1">
                  <CardTitle>RADIUS Ownership Boundary</CardTitle>
                  <CardDescription>
                    PPPoE users are managed independently here. Service plans are shared from global Settings and deleting a
                    RADIUS user does not imply CRM deletion.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Use Settings to manage NAS devices, zone policy, permissions, bandwidth services, and audit logs.
                </CardContent>
              </Card>
            </div>
          ))}
      </div>

      <ImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        existingUsernames={existingUsernames}
        validNasIds={validNasIds}
        importing={bulkImportMutation.isPending}
        onConfirmImport={(payload) => bulkImportMutation.mutateAsync(payload).then(() => undefined)}
      />

      <Dialog
        open={createOpen}
        title="Create PPPoE User"
        description="Provision a RADIUS user only. CRM and shared service definitions remain outside this module."
        onOpenChange={setCreateOpen}
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="radius-username">Username</Label>
              <Input
                id="radius-username"
                value={newUser.username}
                onChange={(event) => setNewUser((prev) => ({ ...prev, username: event.target.value }))}
                placeholder="jdoe_pppoe"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="radius-password">Password</Label>
              <Input
                id="radius-password"
                type="password"
                value={newUser.password}
                onChange={(event) => setNewUser((prev) => ({ ...prev, password: event.target.value }))}
                placeholder="Enter PPPoE password"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="radius-plan">Service Plan</Label>
              <Select
                id="radius-plan"
                value={newUser.plan}
                onChange={(event) => setNewUser((prev) => ({ ...prev, plan: event.target.value }))}
              >
                <option value="">Select plan</option>
                {availablePlans.map((plan) => (
                  <option key={plan.name} value={plan.name}>
                    {plan.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="radius-zone">Zone</Label>
              <Select
                id="radius-zone"
                value={newUser.zoneId}
                onChange={(event) => setNewUser((prev) => ({ ...prev, zoneId: event.target.value }))}
              >
                <option value="">Select zone</option>
                {(zonesQuery.data ?? []).map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="radius-customer-type">Customer Type</Label>
              <Select
                id="radius-customer-type"
                value={newUser.customerType}
                onChange={(event) =>
                  setNewUser((prev) => ({ ...prev, customerType: event.target.value as CustomerType | "" }))
                }
              >
                <option value="">Select customer type</option>
                <option value="individual">Individual</option>
                <option value="corporate">Corporate</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="radius-nas-readonly">NAS</Label>
              <Input
                id="radius-nas-readonly"
                value={selectedNasEntry?.name ?? selectedZone?.nasName ?? ""}
                readOnly
                placeholder="Determined by zone"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="radius-expiration-date">Expiration Date</Label>
            <Input
              id="radius-expiration-date"
              type="datetime-local"
              value={newUser.expirationDate}
              min={minDateTime}
              onChange={(event) => setNewUser((prev) => ({ ...prev, expirationDate: event.target.value }))}
            />
            {!hasValidExpirationDate && newUser.expirationDate ? (
              <p className="text-sm text-destructive">Expiration date must be in the future.</p>
            ) : null}
          </div>

          {newUser.customerType === "corporate" ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="radius-static-ip">Static IP</Label>
                  <Input
                    id="radius-static-ip"
                    value={newUser.staticIp}
                    onChange={(event) => setNewUser((prev) => ({ ...prev, staticIp: event.target.value }))}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="radius-priority">Priority Level</Label>
                  <Select
                    id="radius-priority"
                    value={newUser.priority}
                    onChange={(event) =>
                      setNewUser((prev) => ({ ...prev, priority: event.target.value as PriorityLevel | "" }))
                    }
                  >
                    <option value="">Select priority</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="radius-sla-profile">SLA Profile</Label>
                <Input
                  id="radius-sla-profile"
                  value={newUser.slaProfile}
                  onChange={(event) => setNewUser((prev) => ({ ...prev, slaProfile: event.target.value }))}
                  placeholder="Optional"
                />
              </div>
            </>
          ) : null}

          <p className="text-sm text-muted-foreground">
            NAS routing is determined by the selected zone. Individual users stay lightweight, while corporate users can
            carry optional static IP, priority, and SLA metadata.
          </p>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateUser}
              disabled={createUserMutation.isPending || !canCreateUser}
            >
              {createUserMutation.isPending ? "Creating..." : "Create PPPoE"}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={Boolean(extendModal)}
        title="Extend Subscription"
        description="Select a new expiration date for this PPPoE account."
        onOpenChange={(open) => {
          if (!open) setExtendModal(null);
        }}
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="radius-extend-date">Expiration Date</Label>
            <Input
              id="radius-extend-date"
              type="datetime-local"
              value={extendModal?.expirationDate ?? ""}
              min={minDateTime}
              onChange={(event) =>
                setExtendModal((current) => (current ? { ...current, expirationDate: event.target.value } : current))
              }
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setExtendModal(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                !extendModal?.expirationDate ||
                new Date(extendModal.expirationDate).getTime() <= now ||
                extendUserMutation.isPending
              }
              onClick={() => {
                if (!extendModal) return;
                extendUserMutation.mutate(
                  {
                    username: extendModal.username,
                    expirationDate: new Date(extendModal.expirationDate).toISOString(),
                  },
                  { onSuccess: () => setExtendModal(null) },
                );
              }}
            >
              {extendUserMutation.isPending ? "Saving..." : "Extend"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
