"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { DashboardRealtimePayload } from "@/types";
import { useAppStore, useTenantId } from "@/store/app-store";

function wsEndpoint() {
  const fromEnv = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (!fromEnv) return "ws://localhost:8001/ws";
  if (fromEnv.startsWith("https://")) return `${fromEnv.replace("https://", "wss://")}/ws`;
  if (fromEnv.startsWith("http://")) return `${fromEnv.replace("http://", "ws://")}/ws`;
  return `${fromEnv}/ws`;
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<WebSocket | null>(null);
  const token = useAppStore((state) => state.token);
  const tenantId = useTenantId();
  const applyRealtimePayload = useAppStore((state) => state.applyRealtimePayload);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token || !tenantId) return;

    const ws = new WebSocket(wsEndpoint());
    socketRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "auth",
          token,
          tenant_id: tenantId,
        }),
      );
    };

    ws.onmessage = (event) => {
      try {
        const packet = JSON.parse(event.data) as {
          type: string;
          payload: DashboardRealtimePayload;
          message?: string;
        };

        if (packet.type === "fault_update" && packet.message) {
          toast.error(packet.message);
        }
        if (packet.type === "status_update" && packet.message) {
          toast.info(packet.message);
        }
        if (packet.payload?.mapEvent?.message) {
          toast.info(packet.payload.mapEvent.message);
        }

        applyRealtimePayload(packet.payload);
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["faults"] });
        queryClient.invalidateQueries({ queryKey: ["network-nodes"] });
        queryClient.invalidateQueries({ queryKey: ["fibre-cables"] });
        queryClient.invalidateQueries({ queryKey: ["closures"] });
        queryClient.invalidateQueries({ queryKey: ["customers"] });
      } catch {
        // Ignore malformed events while keeping socket alive.
      }
    };

    ws.onerror = () => {
      toast.warning("Realtime link unstable. Retrying in background.");
    };

    return () => {
      ws.close();
      socketRef.current = null;
    };
  }, [applyRealtimePayload, queryClient, tenantId, token]);

  return <>{children}</>;
}
