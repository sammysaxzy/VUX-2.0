"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { useAppStore, useTenantId } from "@/store/app-store";
import type { RadiusBulkImportPayload } from "@/features/import-export/schema";

export function useRadiusSessions() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["radius-sessions", tenantId],
    queryFn: () => apiClient.getRadiusSessions(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useDisconnectSession() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (username: string) => apiClient.disconnectRadiusSession(username, tenantId, token),
    onSuccess: () => {
      toast.success("User disconnected.");
      queryClient.invalidateQueries({ queryKey: ["radius-sessions", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["settings-logs", tenantId] });
    },
    onError: () => toast.error("Unable to disconnect session."),
  });
}

export function useReconnectSession() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (username: string) => apiClient.reconnectRadiusSession(username, tenantId, token),
    onSuccess: () => {
      toast.success("Reconnect initiated.");
      queryClient.invalidateQueries({ queryKey: ["radius-sessions", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["settings-logs", tenantId] });
    },
    onError: () => toast.error("Unable to reconnect session."),
  });
}

export function useRadiusUsers() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["radius-users", tenantId],
    queryFn: () => apiClient.getRadiusUsers(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useCreateRadiusUser() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      username: string;
      password: string;
      plan: string;
      zoneId: string;
      customerType: "individual" | "corporate";
      expirationDate: string;
      staticIp?: string;
      priority?: "high" | "medium" | "low";
      slaProfile?: string;
    }) => apiClient.createRadiusUser(payload, tenantId, token),
    onSuccess: () => {
      toast.success("PPPoE user created.");
      queryClient.invalidateQueries({ queryKey: ["radius-users", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["radius-sessions", tenantId] });
    },
    onError: () => toast.error("Unable to create PPPoE user."),
  });
}

export function useDeleteRadiusUsers() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (usernames: string[]) => apiClient.deleteRadiusUsers(usernames, tenantId, token),
    onSuccess: (_, usernames) => {
      toast.success(`${usernames.length} PPPoE user${usernames.length === 1 ? "" : "s"} deleted.`);
      queryClient.invalidateQueries({ queryKey: ["radius-users", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["radius-sessions", tenantId] });
    },
    onError: () => toast.error("Unable to delete PPPoE users."),
  });
}

export function useBulkImportRadiusUsers() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RadiusBulkImportPayload[]) => apiClient.bulkImportRadiusUsers(payload, tenantId, token),
    onSuccess: () => {
      toast.success("RADIUS users imported.");
      queryClient.invalidateQueries({ queryKey: ["radius-users", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["radius-sessions", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["settings-logs", tenantId] });
    },
    onError: () => toast.error("Unable to import RADIUS users."),
  });
}

export function useActivateRadiusUser() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (username: string) => apiClient.activateRadiusUser(username, tenantId, token),
    onSuccess: () => {
      toast.success("Radius user activated.");
      queryClient.invalidateQueries({ queryKey: ["radius-users", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["radius-sessions", tenantId] });
    },
    onError: () => toast.error("Unable to activate radius user."),
  });
}

export function useSyncRadiusUser() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (username: string) => apiClient.syncRadiusUser(username, tenantId, token),
    onSuccess: () => {
      toast.success("PPPoE account synced.");
      queryClient.invalidateQueries({ queryKey: ["radius-users", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["settings-logs", tenantId] });
    },
    onError: () => toast.error("Unable to sync user."),
  });
}

export function useExtendRadiusUser() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ username, expirationDate }: { username: string; expirationDate: string }) =>
      apiClient.extendRadiusUser(username, expirationDate, tenantId, token),
    onSuccess: () => {
      toast.success("Subscription extended.");
      queryClient.invalidateQueries({ queryKey: ["radius-users", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["radius-sessions", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["settings-logs", tenantId] });
    },
    onError: () => toast.error("Unable to extend subscription."),
  });
}

export function useExportRadiusUsers() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useMutation({
    mutationFn: () => apiClient.exportRadiusUsers(tenantId, token),
    onError: () => toast.error("Unable to export RADIUS users."),
  });
}

export function useExportRadiusSessions() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useMutation({
    mutationFn: () => apiClient.exportRadiusSessions(tenantId, token),
    onError: () => toast.error("Unable to export sessions."),
  });
}
