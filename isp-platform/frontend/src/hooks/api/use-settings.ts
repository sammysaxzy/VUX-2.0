"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  ActivationQueueRecord,
  MemberRole,
  NasEntry,
  NotificationSettings,
  PaymentProviderConfig,
  PermissionFlags,
  PermissionRole,
  ServicePlan,
  Zone,
} from "@/types";
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

export function useUpdatePermissionRole() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { id: string; payload: { privilegeModel: string; permissionFlags: PermissionFlags } }) =>
      apiClient.updatePermissionRole(payload, tenantId, token),
    onSuccess: () => {
      toast.success("Permission profile updated.");
      queryClient.invalidateQueries({ queryKey: ["settings-permissions", tenantId] });
    },
    onError: () => toast.error("Unable to update permission profile."),
  });
}

export function useDeletePermissionRoles() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => apiClient.deletePermissionRoles(ids, tenantId, token),
    onSuccess: (_, ids) => {
      toast.success(`${ids.length} permission profile${ids.length === 1 ? "" : "s"} deleted.`);
      queryClient.invalidateQueries({ queryKey: ["settings-permissions", tenantId] });
    },
    onError: () => toast.error("Unable to delete permission profiles."),
  });
}

export function useCreatePrivilegeAccount() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { fullName: string; email: string; role: MemberRole; permissionProfileId: string }) =>
      apiClient.createPrivilegeAccount(payload, tenantId, token),
    onSuccess: (member) => {
      toast.success("Member created.");
      queryClient.invalidateQueries({ queryKey: ["settings-permissions", tenantId] });
      return member;
    },
    onError: () => toast.error("Unable to create member."),
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

export function useUpdatePrivilegeAccount() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { permissionProfileId: string } }) =>
      apiClient.updatePrivilegeAccount(id, payload, tenantId, token),
    onSuccess: () => {
      toast.success("Member permission profile updated.");
      queryClient.invalidateQueries({ queryKey: ["settings-permissions", tenantId] });
    },
    onError: () => toast.error("Unable to update member permission profile."),
  });
}

export function useDeletePrivilegeAccount() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.deletePrivilegeAccount(id, tenantId, token),
    onSuccess: () => {
      toast.success("Member removed from permissions.");
      queryClient.invalidateQueries({ queryKey: ["settings-permissions", tenantId] });
    },
    onError: () => toast.error("Unable to remove member."),
  });
}

export function useDeletePrivilegeAccounts() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => apiClient.deletePrivilegeAccounts(ids, tenantId, token),
    onSuccess: (_, ids) => {
      toast.success(`${ids.length} member${ids.length === 1 ? "" : "s"} deleted successfully.`);
      queryClient.invalidateQueries({ queryKey: ["settings-permissions", tenantId] });
    },
    onError: () => toast.error("Unable to delete selected members."),
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

export function useNotificationSettings() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["settings-notifications", tenantId],
    queryFn: () => apiClient.getNotificationSettings(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useUpdateNotificationSettings() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: NotificationSettings) => apiClient.updateNotificationSettings(payload, tenantId, token),
    onSuccess: () => {
      toast.success("Notification settings saved.");
      queryClient.invalidateQueries({ queryKey: ["settings-notifications", tenantId] });
    },
    onError: () => toast.error("Unable to save notification settings."),
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

export function usePaymentProviderConfigs() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["payment-provider-configs", tenantId],
    queryFn: () => apiClient.getPaymentProviderConfigs(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useSavePaymentProviderConfig() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      payload: Omit<PaymentProviderConfig, "id" | "tenant_id" | "created_at" | "updated_at"> & {
        provider: PaymentProviderConfig["provider"];
      },
    ) => apiClient.savePaymentProviderConfig(payload, tenantId, token),
    onSuccess: () => {
      toast.success("Payment provider settings saved.");
      queryClient.invalidateQueries({ queryKey: ["payment-provider-configs", tenantId] });
    },
    onError: () => toast.error("Unable to save payment provider settings."),
  });
}

export function useActivationQueue() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["activation-queue", tenantId],
    queryFn: () => apiClient.getActivationQueue(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useRetryActivationQueueRecord() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recordId: ActivationQueueRecord["id"]) => apiClient.retryActivationQueueRecord(recordId, tenantId, token),
    onSuccess: (result) => {
      toast.success(result.message);
      queryClient.invalidateQueries({ queryKey: ["activation-queue", tenantId] });
    },
    onError: () => toast.error("Unable to retry service activation."),
  });
}
