"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useAppStore, useTenantId } from "@/store/app-store";

export function useSiteManagement() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["site-management", tenantId],
    queryFn: () => apiClient.getSiteManagement(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useNocAlerts() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["noc-alerts", tenantId],
    queryFn: () => apiClient.getNocAlerts(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useUsageAnalytics() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["usage-analytics", tenantId],
    queryFn: () => apiClient.getUsageAnalytics(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useEnterpriseSlaReports() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["enterprise-sla", tenantId],
    queryFn: () => apiClient.getEnterpriseSlaReports(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useProcurementRecords() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["procurement-records", tenantId],
    queryFn: () => apiClient.getProcurementRecords(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useExpenseBreakdown() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["expense-breakdown", tenantId],
    queryFn: () => apiClient.getExpenseBreakdown(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useBackupStatus() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["backup-status", tenantId],
    queryFn: () => apiClient.getBackupStatus(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useIntegrations() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["integrations", tenantId],
    queryFn: () => apiClient.getIntegrations(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useResellerAgents() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["reseller-agents", tenantId],
    queryFn: () => apiClient.getResellerAgents(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useSystemHealth() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["system-health", tenantId],
    queryFn: () => apiClient.getSystemHealth(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useOnboardingChecklist() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["onboarding-checklist", tenantId],
    queryFn: () => apiClient.getOnboardingChecklist(tenantId, token),
    enabled: Boolean(tenantId),
  });
}
