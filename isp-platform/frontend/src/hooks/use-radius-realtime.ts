"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppStore, useTenantId } from "@/store/app-store";
import { radiusWsUrl, USE_MOCKS } from "@/lib/api/client";
import type { RadiusRealtimeEvent, RadiusSession } from "@/types";

export function useRadiusRealtime() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tenantId) return undefined;
    if (USE_MOCKS) return undefined;

    const url = new URL(radiusWsUrl, window.location.origin);
    url.searchParams.set("tenantId", tenantId);
    if (token) url.searchParams.set("token", token);

    const ws = new WebSocket(url.toString());

    const handleMessage = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as RadiusRealtimeEvent;
        if (!payload?.type || !payload.payload) return;

        queryClient.setQueryData<RadiusSession[]>(["radius-sessions", tenantId], (current) => {
          if (!current) return [payload.payload];
          const replaced = current.map((entry) =>
            entry.username === payload.payload.username ? { ...entry, ...payload.payload } : entry,
          );
          const exists = replaced.some((entry) => entry.username === payload.payload.username);
          if (exists) {
            if (payload.type === "session:disconnected") {
              return replaced.map((entry) =>
                entry.username === payload.payload.username ? { ...entry, status: "offline" } : entry,
              );
            }
            return replaced;
          }
          return [...current, payload.payload];
        });
      } catch {
        // ignore malformed events
      }
    };

    ws.addEventListener("message", handleMessage);

    return () => {
      ws.removeEventListener("message", handleMessage);
      ws.close();
    };
  }, [queryClient, tenantId, token]);
}
