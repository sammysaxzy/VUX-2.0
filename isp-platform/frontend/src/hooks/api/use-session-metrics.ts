"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useAppStore, useTenantId } from "@/store/app-store";

type Options = {
  username?: string;
  minutes?: number;
  enabled?: boolean;
};

export function useSessionMetrics({ username, minutes = 10, enabled = true }: Options) {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const active = Boolean(enabled && tenantId && username);

  const detailsQuery = useQuery({
    queryKey: ["radius-session-details", tenantId, username],
    queryFn: () => apiClient.getRadiusSessionDetails(username as string, tenantId, token),
    enabled: active,
    refetchInterval: 5000,
  });

  const trafficQuery = useQuery({
    queryKey: ["radius-session-traffic", tenantId, username, minutes],
    queryFn: () => apiClient.getRadiusSessionTraffic(username as string, tenantId, token, minutes),
    enabled: active,
    refetchInterval: 10000,
  });

  return {
    detailsQuery,
    trafficQuery,
    isLoading: detailsQuery.isLoading || trafficQuery.isLoading,
    isFetching: detailsQuery.isFetching || trafficQuery.isFetching,
  };
}
