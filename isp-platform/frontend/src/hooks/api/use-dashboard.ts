"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useAppStore, useTenantId } from "@/store/app-store";

export function useDashboardData() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["dashboard", tenantId],
    queryFn: () => apiClient.getDashboard(tenantId, token),
    enabled: Boolean(tenantId),
  });
}
