"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { useAppStore, useTenantId } from "@/store/app-store";
import type { RadiusSettings } from "@/types";

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
    mutationFn: (sessionId: string) => apiClient.disconnectRadiusSession(sessionId, tenantId, token),
    onSuccess: () => {
      toast.success("User disconnected.");
      queryClient.invalidateQueries({ queryKey: ["radius-sessions", tenantId] });
    },
    onError: () => toast.error("Unable to disconnect session."),
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
      onuSerial: string;
      olt: string;
      ponPort: string;
    }) => apiClient.createRadiusUser(payload, tenantId, token),
    onSuccess: () => {
      toast.success("Radius user created.");
      queryClient.invalidateQueries({ queryKey: ["radius-users", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["radius-sessions", tenantId] });
    },
    onError: () => toast.error("Unable to create user."),
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

export function useRadiusPlans() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["radius-plans", tenantId],
    queryFn: () => apiClient.getRadiusPlans(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useRadiusSettings() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["radius-settings", tenantId],
    queryFn: () => apiClient.getRadiusSettings(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useSaveRadiusSettings() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RadiusSettings) => apiClient.saveRadiusSettings(payload, tenantId, token),
    onSuccess: () => {
      toast.success("Radius settings saved.");
      queryClient.invalidateQueries({ queryKey: ["radius-settings", tenantId] });
    },
    onError: () => toast.error("Unable to save radius settings."),
  });
}
