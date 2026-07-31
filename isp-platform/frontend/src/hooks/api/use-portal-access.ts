"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { useAppStore, useTenantId } from "@/store/app-store";

export function usePortalAccessStatus(customerId?: string) {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["portal-access", tenantId, customerId],
    queryFn: () => apiClient.getPortalAccessStatus(customerId as string, tenantId, token),
    enabled: Boolean(tenantId && customerId),
    retry: false,
  });
}

export function useProvisionPortalAccess(customerId?: string) {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { username?: string; email?: string; phone?: string; temporaryPassword?: string }) =>
      apiClient.provisionPortalAccess(
        {
          customerId: customerId as string,
          username: payload.username,
          email: payload.email,
          phone: payload.phone,
          temporaryPassword: payload.temporaryPassword,
        },
        tenantId,
        token,
      ),
    onSuccess: () => {
      toast.success("Portal access generated.");
      queryClient.invalidateQueries({ queryKey: ["portal-access", tenantId, customerId] });
    },
    onError: () => toast.error("Unable to provision portal access."),
  });
}
