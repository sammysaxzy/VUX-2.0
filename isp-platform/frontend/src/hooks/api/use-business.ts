"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { useAppStore, useTenantId } from "@/store/app-store";
import type { AiNocResponse, Lead, NotificationRule, ServiceArea, TenantProfile } from "@/types";

export function useTenantProfile() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["tenant-profile", tenantId],
    queryFn: () => apiClient.getTenantProfileSettings(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useSaveTenantProfile() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TenantProfile) => apiClient.updateTenantProfileSettings(payload, tenantId, token),
    onSuccess: () => {
      toast.success("Company settings updated.");
      queryClient.invalidateQueries({ queryKey: ["tenant-profile", tenantId] });
    },
    onError: () => toast.error("Unable to update company settings."),
  });
}

export function useNotificationRules() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["notification-rules", tenantId],
    queryFn: () => apiClient.getNotificationRules(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useSaveNotificationRule() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: NotificationRule) => apiClient.saveNotificationRule(payload, tenantId, token),
    onSuccess: () => {
      toast.success("Notification rule saved.");
      queryClient.invalidateQueries({ queryKey: ["notification-rules", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["settings-logs", tenantId] });
    },
    onError: () => toast.error("Unable to save notification rule."),
  });
}

export function useServiceAreas() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["service-areas", tenantId],
    queryFn: () => apiClient.getServiceAreas(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useCreateServiceArea() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ServiceArea) => apiClient.createServiceArea(payload, tenantId, token),
    onSuccess: () => {
      toast.success("Coverage area added.");
      queryClient.invalidateQueries({ queryKey: ["service-areas", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["settings-logs", tenantId] });
    },
    onError: () => toast.error("Unable to add coverage area."),
  });
}

export function useLeads() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["leads", tenantId],
    queryFn: () => apiClient.getLeads(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useCreateLead() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Lead) => apiClient.createLead(payload, tenantId, token),
    onSuccess: () => {
      toast.success("Lead captured.");
      queryClient.invalidateQueries({ queryKey: ["leads", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["settings-logs", tenantId] });
    },
    onError: () => toast.error("Unable to capture lead."),
  });
}

export function useAiNoc() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useMutation({
    mutationFn: (payload: { prompt: string; mode: AiNocResponse["mode"] }) => apiClient.askAiNoc(payload, tenantId, token),
    onError: () => toast.error("AI NOC request failed."),
  });
}
