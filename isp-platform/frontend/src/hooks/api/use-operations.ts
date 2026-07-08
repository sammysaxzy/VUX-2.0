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

export function useInstallationWorkflow() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["installation-workflow", tenantId],
    queryFn: () => apiClient.getInstallationWorkflow(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useSiteSurveys() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["site-surveys", tenantId],
    queryFn: () => apiClient.getSiteSurveys(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useFaultWorkflowTickets() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["fault-workflow", tenantId],
    queryFn: () => apiClient.getFaultWorkflowTickets(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useOutageMaintenance() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["outage-maintenance", tenantId],
    queryFn: () => apiClient.getOutageMaintenance(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useCommunicationTemplates() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["communication-templates", tenantId],
    queryFn: () => apiClient.getCommunicationTemplates(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useKnowledgeBase() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["knowledge-base", tenantId],
    queryFn: () => apiClient.getKnowledgeBase(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useApprovalRequests() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["approval-requests", tenantId],
    queryFn: () => apiClient.getApprovalRequests(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useDiscountPromos() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["discount-promos", tenantId],
    queryFn: () => apiClient.getDiscountPromos(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useCommissionRecords() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["commission-records", tenantId],
    queryFn: () => apiClient.getCommissionRecords(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useChurnRetention() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["churn-retention", tenantId],
    queryFn: () => apiClient.getChurnRetention(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useImportValidationSummaries() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["import-validation", tenantId],
    queryFn: () => apiClient.getImportValidationSummaries(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useDemoModeSettings() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["demo-mode", tenantId],
    queryFn: () => apiClient.getDemoModeSettings(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useSecurityControls() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["security-controls", tenantId],
    queryFn: () => apiClient.getSecurityControls(tenantId, token),
    enabled: Boolean(tenantId),
  });
}
