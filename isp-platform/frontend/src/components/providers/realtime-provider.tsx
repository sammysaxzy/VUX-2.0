"use client";

import { useEffect, useRef } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ClosureBox, Customer, DashboardRealtimePayload, Fault, FibreCable, NetworkNode } from "@/types";
import { useAppStore, useTenantId } from "@/store/app-store";

function wsEndpoint() {
  const fromEnv = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (!fromEnv) return "ws://localhost:8001/ws";
  if (fromEnv.startsWith("https://")) return `${fromEnv.replace("https://", "wss://")}/ws`;
  if (fromEnv.startsWith("http://")) return `${fromEnv.replace("http://", "ws://")}/ws`;
  return `${fromEnv}/ws`;
}

function upsertById<T extends { id: string }>(items: T[], entry: T) {
  const index = items.findIndex((item) => item.id === entry.id);
  if (index < 0) return [entry, ...items];
  const next = [...items];
  next[index] = entry;
  return next;
}

function patchCustomerStatus(queryClient: QueryClient, tenantId: string, payload?: DashboardRealtimePayload["customerStatusUpdate"]) {
  if (!payload) return false;
  queryClient.setQueryData<Customer[]>(["customers", tenantId], (current) => {
    if (!current) return current;
    return current.map((customer) => (customer.id === payload.customerId ? { ...customer, online: payload.online } : customer));
  });
  return true;
}

function patchMapEvent(queryClient: QueryClient, tenantId: string, mapEvent?: DashboardRealtimePayload["mapEvent"]) {
  if (!mapEvent) return false;
  let touched = false;

  if (mapEvent.node || mapEvent.mst || mapEvent.deletedNodeId || (mapEvent.type === "client_removed" && mapEvent.mstId && mapEvent.portNumber)) {
    touched = true;
    queryClient.setQueryData<NetworkNode[]>(["network-nodes", tenantId], (current) => {
      if (!current) return current;
      let next = [...current];

      if (mapEvent.node) next = upsertById(next, mapEvent.node);
      if (mapEvent.mst) next = upsertById(next, mapEvent.mst);
      if (mapEvent.deletedNodeId) next = next.filter((node) => node.id !== mapEvent.deletedNodeId);

      if (mapEvent.type === "client_removed" && mapEvent.mstId && mapEvent.portNumber) {
        next = next.map((node) => {
          if (node.id !== mapEvent.mstId) return node;
          return {
            ...node,
            splitterPorts: (node.splitterPorts ?? []).map((port) =>
              port.port === mapEvent.portNumber
                ? {
                    ...port,
                    status: "free",
                    customerId: undefined,
                    customerName: undefined,
                    assignedCoreColor: undefined,
                  }
                : port,
            ),
            clients: (node.clients ?? []).filter((client) => client.id !== mapEvent.customerId),
          };
        });
      }

      return next;
    });
  }

  if (mapEvent.cable || mapEvent.core || mapEvent.deletedCableId || (mapEvent.removedCableIds?.length ?? 0) > 0) {
    touched = true;
    queryClient.setQueryData<FibreCable[]>(["fibre-cables", tenantId], (current) => {
      if (!current) return current;
      let next = [...current];

      if (mapEvent.cable) next = upsertById(next, mapEvent.cable);
      if (mapEvent.deletedCableId) next = next.filter((cable) => cable.id !== mapEvent.deletedCableId);
      if (mapEvent.removedCableIds?.length) next = next.filter((cable) => !mapEvent.removedCableIds?.includes(cable.id));

      if (mapEvent.cableId && mapEvent.core) {
        next = next.map((cable) =>
          cable.id !== mapEvent.cableId
            ? cable
            : {
                ...cable,
                cores: cable.cores.map((core) => (core.id === mapEvent.core?.id ? mapEvent.core : core)),
              },
        );
      }

      return next;
    });
  }

  if (mapEvent.closure || mapEvent.deletedClosureId || mapEvent.deletedCableId || (mapEvent.removedCableIds?.length ?? 0) > 0) {
    touched = true;
    queryClient.setQueryData<ClosureBox[]>(["closures", tenantId], (current) => {
      if (!current) return current;
      let next = [...current];

      if (mapEvent.closure) next = upsertById(next, mapEvent.closure);
      if (mapEvent.deletedClosureId) next = next.filter((closure) => closure.id !== mapEvent.deletedClosureId);

      const removedCableIds = [
        ...(mapEvent.deletedCableId ? [mapEvent.deletedCableId] : []),
        ...(mapEvent.removedCableIds ?? []),
      ];

      if (removedCableIds.length > 0) {
        next = next.map((closure) => ({
          ...closure,
          connectedCableIds: closure.connectedCableIds.filter((id) => !removedCableIds.includes(id)),
          splices: closure.splices.filter(
            (splice) => !removedCableIds.includes(splice.fromCableId) && !removedCableIds.includes(splice.toCableId),
          ),
        }));
      }

      return next;
    });
  }

  if (mapEvent.customer || mapEvent.customerId || mapEvent.deletedNodeId || mapEvent.type === "client_removed") {
    touched = true;
    queryClient.setQueryData<Customer[]>(["customers", tenantId], (current) => {
      if (!current) return current;
      let next = [...current];

      if (mapEvent.customer) next = upsertById(next, mapEvent.customer);

      if (mapEvent.deletedNodeId) {
        next = next.map((customer) =>
          customer.mstId === mapEvent.deletedNodeId
            ? { ...customer, mstId: undefined, splitterPort: undefined, fibreCoreId: undefined }
            : customer,
        );
      }

      if (mapEvent.type === "client_removed" && mapEvent.customerId) {
        next = next.map((customer) =>
          customer.id === mapEvent.customerId
            ? { ...customer, mstId: undefined, splitterPort: undefined, fibreCoreId: undefined }
            : customer,
        );
      }

      return next;
    });
  }

  return touched;
}

function patchFault(queryClient: QueryClient, tenantId: string, fault?: Fault) {
  if (!fault) return false;
  queryClient.setQueryData<Fault[]>(["faults", tenantId], (current) => {
    if (!current) return [fault];
    return upsertById(current, fault);
  });
  return true;
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

        const patchedCustomerStatus = patchCustomerStatus(queryClient, tenantId, packet.payload?.customerStatusUpdate);
        const patchedMapEvent = patchMapEvent(queryClient, tenantId, packet.payload?.mapEvent);
        const patchedFault = patchFault(queryClient, tenantId, packet.payload?.fault);

        queryClient.invalidateQueries({ queryKey: ["dashboard", tenantId] });
        if (!patchedFault) queryClient.invalidateQueries({ queryKey: ["faults", tenantId] });
        if (!(patchedCustomerStatus || patchedMapEvent)) {
          queryClient.invalidateQueries({ queryKey: ["network-nodes", tenantId] });
          queryClient.invalidateQueries({ queryKey: ["fibre-cables", tenantId] });
          queryClient.invalidateQueries({ queryKey: ["closures", tenantId] });
          queryClient.invalidateQueries({ queryKey: ["customers", tenantId] });
        }
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
