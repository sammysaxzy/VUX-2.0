"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { useAppStore, useTenantId } from "@/store/app-store";
import type { Fault } from "@/types";

export function useFaults() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["faults", tenantId],
    queryFn: () => apiClient.getFaults(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useReportFault() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<Fault, "id" | "tenantId" | "createdAt">) =>
      apiClient.reportFault(payload, tenantId, token),
    onSuccess: () => {
      toast.success("Fault reported to NOC.");
      queryClient.invalidateQueries({ queryKey: ["faults", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", tenantId] });
    },
    onError: () => toast.error("Failed to report fault."),
  });
}
