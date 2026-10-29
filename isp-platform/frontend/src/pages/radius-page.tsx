"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useCustomers } from "@/hooks/api/use-customers";
import { hasPermission } from "@/lib/permissions";
import { useAppStore } from "@/store/app-store";
import type { RadiusTab } from "@/types";
import {
  useBulkImportRadiusUsers,
  useCreateRadiusUser,
  useDeleteRadiusUsers,
  useDisconnectSession,
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
import { SessionDetailsModal } from "@/components/radius/session-details-modal";
import { RadiusTabs } from "@/components/radius/radius-tabs";
import { UsersTable } from "@/components/radius/users-table";
import { toDateTimeLocalValue } from "@/lib/utils";
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
type RadiusUserForm = {
  username: string;
  password: string;
  customerId: string;
  plan: string;
  zoneId: string;
  expirationDate: string;
};

const baseForm: RadiusUserForm = {
  username: "",
  password: "",
  customerId: "",
  plan: "",
  zoneId: "",
  expirationDate: "",
};

export function RadiusPage() {
  const user = useAppStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<RadiusTab>("sessions");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [sessionDetailsOpen, setSessionDetailsOpen] = useState(false);
  const [selectedSessionUsername, setSelectedSessionUsername] = useState<string>();
  const [importOpen, setImportOpen] = useState(false);
  const [selectedUsernames, setSelectedUsernames] = useState<string[]>([]);
  const [deleteUsersOpen, setDeleteUsersOpen] = useState(false);
  const [newUser, setNewUser] = useState<RadiusUserForm>(baseForm);
  const [customerLookup, setCustomerLookup] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const customersQuery = useCustomers();
  const sessionsQuery = useRadiusSessions();
  const disconnectMutation = useDisconnectSession();
  const reconnectMutation = useReconnectSession();
  const usersQuery = useRadiusUsers();
  const deleteUsersMutation = useDeleteRadiusUsers();
  const servicesQuery = useServicePlans();
  const zonesQuery = useZones();
  const nasQuery = useNasEntries();
  const createUserMutation = useCreateRadiusUser();
  const bulkImportMutation = useBulkImportRadiusUsers();
  const syncUserMutation = useSyncRadiusUser();
  const exportUsersMutation = useExportRadiusUsers();
  const exportSessionsMutation = useExportRadiusSessions();
  const canAccessRadius = hasPermission(user, "radius_access");
  const canDisconnectUsers = hasPermission(user, "disconnect_user");
  const canCreatePppoe = hasPermission(user, "create_pppoe");

  useRadiusRealtime();

  if (!canAccessRadius) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Your permission profile does not allow access to RADIUS operations.
        </CardContent>
      </Card>
    );
  }

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const serviceOptions = useMemo(() => servicesQuery.data ?? [], [servicesQuery.data]);
  const availablePlans = useMemo(() => serviceOptions, [serviceOptions]);
  const customerOptions = useMemo(() => customersQuery.data ?? [], [customersQuery.data]);
  const filteredUsers = useMemo(() => {
    const users = usersQuery.data ?? [];
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => user.username.toLowerCase().includes(query));
  }, [search, usersQuery.data]);
  const validNasIds = useMemo(() => (nasQuery.data ?? []).map((entry) => entry.id), [nasQuery.data]);
  const existingUsernames = useMemo(() => (usersQuery.data ?? []).map((user) => user.username), [usersQuery.data]);
  const visibleUsernames = useMemo(() => filteredUsers.map((user) => user.username), [filteredUsers]);

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
    setCustomerLookup("");
    setCreateOpen(false);
    createUserMutation.reset();
  }, [availablePlans, createUserMutation, serviceOptions, zonesQuery.data]);

  useEffect(() => {
    const availableUsernames = new Set((usersQuery.data ?? []).map((user) => user.username));
    setSelectedUsernames((current) => current.filter((username) => availableUsernames.has(username)));
  }, [usersQuery.data]);

  const selectedZone = useMemo(
    () => (zonesQuery.data ?? []).find((zone) => zone.id === newUser.zoneId),
    [newUser.zoneId, zonesQuery.data],
  );
  const selectedCustomer = useMemo(
    () => customerOptions.find((customer) => customer.id === newUser.customerId),
    [customerOptions, newUser.customerId],
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
    Boolean(newUser.customerId.trim()) &&
    Boolean(newUser.plan.trim()) &&
    Boolean(newUser.zoneId.trim()) &&
    hasValidExpirationDate;

  const handleCreateUser = () => {
    if (!canCreatePppoe) {
      toast.error("Your permission profile cannot create PPPoE users.");
      return;
    }
    if (!newUser.username.trim() || !newUser.password.trim() || !newUser.customerId.trim() || !newUser.plan.trim() || !newUser.zoneId.trim()) {
      toast.error("Fill in the required PPPoE fields.");
      return;
    }
    if (!hasValidExpirationDate) {
      toast.error("Choose a future expiration date and time.");
      return;
    }

    createUserMutation.mutate({
      username: newUser.username,
      password: newUser.password,
      customerId: newUser.customerId,
      plan: newUser.plan,
      zoneId: newUser.zoneId,
      expirationDate: new Date(newUser.expirationDate).toISOString(),
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

  const toggleUserSelection = (username: string) => {
    setSelectedUsernames((current) =>
      current.includes(username) ? current.filter((entry) => entry !== username) : [...current, username],
    );
  };

  const toggleAllVisibleUsers = () => {
    setSelectedUsernames((current) => {
      const allVisibleSelected = visibleUsernames.length > 0 && visibleUsernames.every((username) => current.includes(username));
      if (allVisibleSelected) {
        return current.filter((username) => !visibleUsernames.includes(username));
      }
      return [...new Set([...current, ...visibleUsernames])];
    });
  };

  const confirmDeleteUsers = () => {
    if (selectedUsernames.length === 0) return;
    deleteUsersMutation.mutate(selectedUsernames, {
      onSuccess: () => {
        setSelectedUsernames([]);
        setDeleteUsersOpen(false);
      },
    });
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
              <Button
                type="button"
                variant="danger"
                disabled={!canCreatePppoe || selectedUsernames.length === 0}
                onClick={() => setDeleteUsersOpen(true)}
              >
                Delete
              </Button>
              <Button type="button" variant="outline" disabled={!canCreatePppoe} onClick={() => setImportOpen(true)}>
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
            <Button type="button" disabled={!canCreatePppoe} onClick={() => setCreateOpen(true)}>
              Create User
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
              onSelect={(username) => {
                setSelectedSessionUsername(username);
                setSessionDetailsOpen(true);
              }}
              onSync={(username) => syncUserMutation.mutate(username)}
              busySync={syncUserMutation.variables}
              canSync={canCreatePppoe}
            />
          ))}

        {activeTab === "users" &&
          (usersQuery.isLoading || servicesQuery.isLoading || zonesQuery.isLoading || nasQuery.isLoading || !usersQuery.data ? (
            <PageSkeleton />
          ) : (
            <div className="space-y-4">
              <UsersTable
                users={filteredUsers}
                selectedUsernames={selectedUsernames}
                onToggleSelect={toggleUserSelection}
                onToggleSelectAll={toggleAllVisibleUsers}
                onDisconnect={(username) => disconnectMutation.mutate(username)}
                onReconnect={(username) => reconnectMutation.mutate(username)}
                busyDisconnect={disconnectMutation.variables}
                busyReconnect={reconnectMutation.variables}
                canManageUsers={canCreatePppoe}
                canDisconnect={canDisconnectUsers}
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
        onConfirmImport={(payload) => {
          if (!canCreatePppoe) return Promise.resolve(undefined);
          return bulkImportMutation.mutateAsync(payload).then(() => undefined);
        }}
      />

      <Dialog
        open={deleteUsersOpen}
        title="Delete PPPoE Users"
        description={`Are you sure you want to delete ${selectedUsernames.length} selected item${selectedUsernames.length === 1 ? "" : "s"}?`}
        onOpenChange={setDeleteUsersOpen}
      >
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setDeleteUsersOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={!canCreatePppoe || deleteUsersMutation.isPending}
            onClick={confirmDeleteUsers}
          >
            {deleteUsersMutation.isPending ? "Deleting..." : "Confirm Delete"}
          </Button>
        </div>
      </Dialog>

      <SessionDetailsModal
        open={sessionDetailsOpen}
        username={selectedSessionUsername}
        onOpenChange={(open) => {
          setSessionDetailsOpen(open);
          if (!open) setSelectedSessionUsername(undefined);
        }}
      />

      <Dialog
        open={createOpen}
        title="Create PPPoE User"
        description="Provision a RADIUS user only. CRM and shared service definitions remain outside this module."
        onOpenChange={(open) => {
          if (!canCreatePppoe) return;
          setCreateOpen(open);
        }}
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="radius-customer-lookup">Linked Customer</Label>
              <Input
                id="radius-customer-lookup"
                list="radius-customer-options"
                value={customerLookup}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setCustomerLookup(nextValue);
                  const matchedCustomer = customerOptions.find(
                    (customer) => `${customer.name} (${customer.email})` === nextValue,
                  );
                  setNewUser((prev) => ({
                    ...prev,
                    customerId: matchedCustomer?.id ?? "",
                    username:
                      !prev.username.trim() || prev.username === `cust_${prev.customerId}`
                        ? matchedCustomer
                          ? `cust_${matchedCustomer.id}`
                          : ""
                        : prev.username,
                  }));
                }}
                placeholder="Search customer by name or email"
              />
              <datalist id="radius-customer-options">
                {customerOptions.map((customer) => (
                  <option key={customer.id} value={`${customer.name} (${customer.email})`} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="radius-username">Username</Label>
              <Input
                id="radius-username"
                value={newUser.username}
                onChange={(event) => setNewUser((prev) => ({ ...prev, username: event.target.value }))}
                placeholder={selectedCustomer ? `cust_${selectedCustomer.id}` : "jdoe_pppoe"}
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
              <Label htmlFor="radius-nas-readonly">NAS</Label>
              <Input
                id="radius-nas-readonly"
                value={selectedNasEntry?.name ?? selectedZone?.nasName ?? ""}
                readOnly
                placeholder="Determined by zone"
              />
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
          </div>

          <p className="text-sm text-muted-foreground">
            NAS routing is determined by the selected zone. Customer selection is required and the PPPoE account stays linked to CRM through the internal customer record.
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
              {createUserMutation.isPending ? "Creating..." : "Create User"}
            </Button>
          </div>
        </div>
      </Dialog>

    </div>
  );
}
