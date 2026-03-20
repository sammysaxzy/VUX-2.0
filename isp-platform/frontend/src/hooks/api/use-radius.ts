"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { useAppStore, useTenantId } from "@/store/app-store";

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

export function useSuspendAccount() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (customerId: string) => apiClient.suspendCustomer(customerId, tenantId, token),
    onSuccess: () => {
      toast.success("Account suspended.");
      queryClient.invalidateQueries({ queryKey: ["customers", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["radius-sessions", tenantId] });
    },
    onError: () => toast.error("Unable to suspend account."),
  });
}
