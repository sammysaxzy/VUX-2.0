"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { useAppStore, useTenantId } from "@/store/app-store";
import type { Customer } from "@/types";

export function useCustomers() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["customers", tenantId],
    queryFn: () => apiClient.getCustomers(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useCustomer(id?: string) {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["customers", tenantId, id],
    queryFn: () => apiClient.getCustomerById(id as string, tenantId, token),
    enabled: Boolean(tenantId && id),
  });
}

export function useSaveCustomer() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Customer) => apiClient.upsertCustomer(payload, tenantId, token),
    onSuccess: () => {
      toast.success("Customer record saved.");
      queryClient.invalidateQueries({ queryKey: ["customers", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", tenantId] });
    },
    onError: () => toast.error("Unable to save customer."),
  });
}

export function useExportCustomers() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useMutation({
    mutationFn: () => apiClient.exportCustomers(tenantId, token),
    onError: () => toast.error("Unable to export customers."),
  });
}
