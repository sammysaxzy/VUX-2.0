"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { NasEntry, ServicePlan, Zone } from "@/types";
import { apiClient } from "@/lib/api/client";
import { useAppStore, useTenantId } from "@/store/app-store";

export function useServicePlans() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["settings-services", tenantId],
    queryFn: () => apiClient.getServicePlans(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useCreateServicePlan() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ServicePlan) => apiClient.createServicePlan(payload, tenantId, token),
    onSuccess: () => {
      toast.success("Bandwidth plan saved.");
      queryClient.invalidateQueries({ queryKey: ["settings-services", tenantId] });
    },
    onError: () => toast.error("Unable to save bandwidth plan."),
  });
}

export function useNasEntries() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["settings-nas", tenantId],
    queryFn: () => apiClient.getNasEntries(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useCreateNasEntry() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<NasEntry, "id">) => apiClient.createNasEntry(payload, tenantId, token),
    onSuccess: () => {
      toast.success("NAS added.");
      queryClient.invalidateQueries({ queryKey: ["settings-nas", tenantId] });
    },
    onError: () => toast.error("Unable to add NAS."),
  });
}

export function useUpdateNasEntry() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Omit<NasEntry, "id"> }) =>
      apiClient.updateNasEntry(id, payload, tenantId, token),
    onSuccess: () => {
      toast.success("NAS updated.");
      queryClient.invalidateQueries({ queryKey: ["settings-nas", tenantId] });
    },
    onError: () => toast.error("Unable to update NAS."),
  });
}

export function useDeleteNasEntries() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => apiClient.deleteNasEntries(ids, tenantId, token),
    onSuccess: (_, ids) => {
      toast.success(`${ids.length} NAS entr${ids.length === 1 ? "y" : "ies"} deleted.`);
      queryClient.invalidateQueries({ queryKey: ["settings-nas", tenantId] });
    },
    onError: () => toast.error("Unable to delete NAS entries."),
  });
}

export function useZones() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["settings-zones", tenantId],
    queryFn: () => apiClient.getZones(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useCreateZone() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<Zone, "id" | "usersCount" | "nasName"> & { usersCount?: number }) =>
      apiClient.createZone(payload, tenantId, token),
    onSuccess: () => {
      toast.success("Zone created.");
      queryClient.invalidateQueries({ queryKey: ["settings-zones", tenantId] });
    },
    onError: () => toast.error("Unable to create zone."),
  });
}

export function useDeleteZones() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => apiClient.deleteZones(ids, tenantId, token),
    onSuccess: (_, ids) => {
      toast.success(`${ids.length} zone${ids.length === 1 ? "" : "s"} deleted.`);
      queryClient.invalidateQueries({ queryKey: ["settings-zones", tenantId] });
    },
    onError: () => toast.error("Unable to delete zones."),
  });
}

export function usePermissionRoles() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["settings-permissions", tenantId],
    queryFn: () => apiClient.getPermissionRoles(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useDeletePermissionRoles() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => apiClient.deletePermissionRoles(ids, tenantId, token),
    onSuccess: (_, ids) => {
      toast.success(`${ids.length} permission role${ids.length === 1 ? "" : "s"} deleted.`);
      queryClient.invalidateQueries({ queryKey: ["settings-permissions", tenantId] });
    },
    onError: () => toast.error("Unable to delete permission roles."),
  });
}

export function useUpdatePermissionRole() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: { privilegeModel?: "Role Based" | "Approval Based" | "Hybrid"; description?: string };
    }) => apiClient.updatePermissionRole(id, payload, tenantId, token),
    onSuccess: () => {
      toast.success("Permission role updated.");
      queryClient.invalidateQueries({ queryKey: ["settings-permissions", tenantId] });
    },
    onError: () => toast.error("Unable to update permission role."),
  });
}

export function useCreatePrivilegeAccount() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { fullName: string; email: string; roleId: string }) =>
      apiClient.createPrivilegeAccount(payload, tenantId, token),
    onSuccess: () => {
      toast.success("Privilege account created.");
      queryClient.invalidateQueries({ queryKey: ["settings-permissions", tenantId] });
    },
    onError: () => toast.error("Unable to create privilege account."),
  });
}

export function useSettingsLogs() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["settings-logs", tenantId],
    queryFn: () => apiClient.getSettingsLogs(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useDeleteServicePlans() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (names: string[]) => apiClient.deleteServicePlans(names, tenantId, token),
    onSuccess: (_, names) => {
      toast.success(`${names.length} service plan${names.length === 1 ? "" : "s"} deleted.`);
      queryClient.invalidateQueries({ queryKey: ["settings-services", tenantId] });
    },
    onError: () => toast.error("Unable to delete service plans."),
  });
}

export function useDeleteSettingsLogs() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => apiClient.deleteSettingsLogs(ids, tenantId, token),
    onSuccess: (_, ids) => {
      toast.success(`${ids.length} log entr${ids.length === 1 ? "y" : "ies"} deleted.`);
      queryClient.invalidateQueries({ queryKey: ["settings-logs", tenantId] });
    },
    onError: () => toast.error("Unable to delete log entries."),
  });
}
