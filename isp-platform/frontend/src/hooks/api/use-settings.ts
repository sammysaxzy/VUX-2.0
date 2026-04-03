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

export function usePermissionRoles() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["settings-permissions", tenantId],
    queryFn: () => apiClient.getPermissionRoles(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useSavePermissionMemberAccess() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      member: {
        id?: string;
        userId?: string;
        fullName: string;
        email: string;
        mapRole: "admin" | "engineer" | "viewer";
        canDelete: boolean;
      };
    }) => apiClient.savePermissionMemberAccess(payload, tenantId, token),
    onSuccess: () => {
      toast.success("Permission access updated.");
      queryClient.invalidateQueries({ queryKey: ["settings-permissions", tenantId] });
    },
    onError: () => toast.error("Unable to update permission access."),
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
