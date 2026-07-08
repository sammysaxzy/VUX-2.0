"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { useAppStore, useTenantId } from "@/store/app-store";
import type {
  ApprovalWorkflowRecord,
  CommissionRecord,
  CommunicationTemplateRecord,
  DemoModeSettings,
  DiscountPromoRecord,
  KnowledgeBaseArticle,
  SecurityControlSettings,
} from "@/types";

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

export function useSaveCommunicationTemplate() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CommunicationTemplateRecord) => apiClient.saveCommunicationTemplate(payload, tenantId, token),
    onSuccess: () => {
      toast.success("Communication template saved.");
      queryClient.invalidateQueries({ queryKey: ["communication-templates", tenantId] });
    },
    onError: () => toast.error("Unable to save communication template."),
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

export function useSaveKnowledgeBaseArticle() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: KnowledgeBaseArticle) => apiClient.saveKnowledgeBaseArticle(payload, tenantId, token),
    onSuccess: () => {
      toast.success("Knowledge base article saved.");
      queryClient.invalidateQueries({ queryKey: ["knowledge-base", tenantId] });
    },
    onError: () => toast.error("Unable to save knowledge base article."),
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

export function useSaveApprovalRequest() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ApprovalWorkflowRecord) => apiClient.saveApprovalRequest(payload, tenantId, token),
    onSuccess: () => {
      toast.success("Approval request saved.");
      queryClient.invalidateQueries({ queryKey: ["approval-requests", tenantId] });
    },
    onError: () => toast.error("Unable to save approval request."),
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

export function useSaveDiscountPromo() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DiscountPromoRecord) => apiClient.saveDiscountPromo(payload, tenantId, token),
    onSuccess: () => {
      toast.success("Discount promo saved.");
      queryClient.invalidateQueries({ queryKey: ["discount-promos", tenantId] });
    },
    onError: () => toast.error("Unable to save discount promo."),
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

export function useSaveCommissionRecord() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CommissionRecord) => apiClient.saveCommissionRecord(payload, tenantId, token),
    onSuccess: () => {
      toast.success("Commission record saved.");
      queryClient.invalidateQueries({ queryKey: ["commission-records", tenantId] });
    },
    onError: () => toast.error("Unable to save commission record."),
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

export function useSaveDemoModeSettings() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DemoModeSettings) => apiClient.updateDemoModeSettings(payload, tenantId, token),
    onSuccess: () => {
      toast.success("Demo mode settings updated.");
      queryClient.invalidateQueries({ queryKey: ["demo-mode", tenantId] });
    },
    onError: () => toast.error("Unable to update demo mode settings."),
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

export function useSaveSecurityControls() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SecurityControlSettings) => apiClient.updateSecurityControls(payload, tenantId, token),
    onSuccess: () => {
      toast.success("Security controls updated.");
      queryClient.invalidateQueries({ queryKey: ["security-controls", tenantId] });
    },
    onError: () => toast.error("Unable to update security controls."),
  });
}
