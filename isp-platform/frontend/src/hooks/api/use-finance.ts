"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { useAppStore, useTenantId } from "@/store/app-store";
import type { FinancialTransaction } from "@/types";

export function useFinanceSummary() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["finance-summary", tenantId],
    queryFn: () => apiClient.getFinanceSummary(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useFinancialTransactions() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["finance-transactions", tenantId],
    queryFn: () => apiClient.getFinancialTransactions(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useCreateFinancialTransaction() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<FinancialTransaction, "id" | "transaction_code" | "created_by_user_id" | "created_at" | "updated_at">) =>
      apiClient.createFinancialTransaction(payload, tenantId, token),
    onSuccess: () => {
      toast.success("Transaction saved.");
      queryClient.invalidateQueries({ queryKey: ["finance-summary", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["finance-transactions", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", tenantId] });
    },
    onError: () => toast.error("Unable to save transaction."),
  });
}

export function useSyncBillingIncome() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.syncBillingIncome(tenantId, token),
    onSuccess: (result) => {
      toast.success(`Synchronized ${result.created} billing payments.`);
      queryClient.invalidateQueries({ queryKey: ["finance-summary", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["finance-transactions", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", tenantId] });
    },
    onError: () => toast.error("Unable to sync billing income."),
  });
}
