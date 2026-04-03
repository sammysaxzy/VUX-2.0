"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { useAppStore, useTenantId } from "@/store/app-store";

export function useNetworkNodes() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["network-nodes", tenantId],
    queryFn: () => apiClient.getNodes(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useFibreCables() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["fibre-cables", tenantId],
    queryFn: () => apiClient.getFibre(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useSplicingActivities() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["splicing", tenantId],
    queryFn: () => apiClient.getSplicing(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useClosures() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["closures", tenantId],
    queryFn: () => apiClient.getClosures(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useCreateMstConnection() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      startMstId: string;
      endMstId: string;
      geometry: { lat: number; lng: number }[];
      coreCount: 2 | 4 | 8 | 12 | 24;
    }) => apiClient.createMstConnection(payload, tenantId, token),
    onSuccess: () => {
      toast.success("MST-to-MST fibre connection created.");
      queryClient.invalidateQueries({ queryKey: ["fibre-cables", tenantId] });
    },
    onError: () => toast.error("Failed to create fibre connection."),
  });
}

export function useAssignCoreToCable() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { cableId: string; coreId: string }) => apiClient.assignCableCore(payload, tenantId, token),
    onSuccess: () => {
      toast.success("Core assigned successfully.");
      queryClient.invalidateQueries({ queryKey: ["fibre-cables", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["network-nodes", tenantId] });
    },
    onError: (error: Error) => toast.error(error.message || "Core assignment failed."),
  });
}

export function useSetCableCoreState() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      cableId: string;
      coreId: string;
      status: "free" | "used";
      fromMstId?: string;
      toMstId?: string;
      usagePath?: string;
      assignedToCustomerId?: string;
    }) => apiClient.setCableCoreState(payload, tenantId, token),
    onSuccess: () => {
      toast.success("Cable core updated.");
      queryClient.invalidateQueries({ queryKey: ["fibre-cables", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["network-nodes", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["customers", tenantId] });
    },
    onError: (error: Error) => toast.error(error.message || "Failed to update cable core."),
  });
}

export function useDeleteFibreCable() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { cableId: string }) => apiClient.deleteFibreCable(payload, tenantId, token),
    onSuccess: () => {
      toast.success("Fibre cable deleted.");
      queryClient.invalidateQueries({ queryKey: ["fibre-cables", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["closures", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["customers", tenantId] });
    },
    onError: (error: Error) => toast.error(error.message || "Failed to delete cable."),
  });
}

export function useDeleteNetworkNode() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { nodeId: string }) => apiClient.deleteNetworkNode(payload, tenantId, token),
    onSuccess: () => {
      toast.success("Infrastructure node deleted.");
      queryClient.invalidateQueries({ queryKey: ["network-nodes", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["fibre-cables", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["closures", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["customers", tenantId] });
    },
    onError: (error: Error) => toast.error(error.message || "Failed to delete node."),
  });
}

export function useDeleteClosure() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { closureId: string }) => apiClient.deleteClosure(payload, tenantId, token),
    onSuccess: () => {
      toast.success("Closure deleted.");
      queryClient.invalidateQueries({ queryKey: ["closures", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["network-nodes", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["fibre-cables", tenantId] });
    },
    onError: (error: Error) => toast.error(error.message || "Failed to delete closure."),
  });
}

export function useUpsertClosureSplice() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      closureId: string;
      splice: {
        id?: string;
        fromCableId: string;
        fromCoreColor: string;
        toCableId: string;
        toCoreColor: string;
        notes?: string;
      };
    }) => apiClient.upsertClosureSplice(payload, tenantId, token),
    onSuccess: () => {
      toast.success("Closure splice updated.");
      queryClient.invalidateQueries({ queryKey: ["closures", tenantId] });
    },
    onError: () => toast.error("Unable to save splice."),
  });
}

export function useDeleteClosureSplice() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { closureId: string; spliceId: string }) => apiClient.deleteClosureSplice(payload, tenantId, token),
    onSuccess: () => {
      toast.success("Splice removed.");
      queryClient.invalidateQueries({ queryKey: ["closures", tenantId] });
    },
    onError: () => toast.error("Unable to remove splice."),
  });
}

export function useAssignClientToMstPort() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      mstId: string;
      portNumber: number;
      clientId: string;
      clientName: string;
      fiberCore: string;
      coreId: string;
      coreLabel: string;
      cableId: string;
      clientLocation: { lat: number; lng: number };
      geometry: Array<{ lat: number; lng: number }>;
      routeMode: "road" | "straight";
      routeSource: "mapbox-directions" | "seeded" | "straight-line-fallback";
      routeFallbackReason?: string;
    }) => apiClient.assignClientToMstPort(payload, tenantId, token),
    onSuccess: () => {
      toast.success("Client assigned to splitter port.");
      queryClient.invalidateQueries({ queryKey: ["network-nodes", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["customers", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["fibre-cables", tenantId] });
    },
    onError: (error: Error) => toast.error(error.message || "Failed to assign client."),
  });
}

export function useRemoveClientFromMstPort() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { mstId: string; portNumber: number }) => apiClient.removeClientFromMstPort(payload, tenantId, token),
    onSuccess: () => {
      toast.success("Client removed from splitter port.");
      queryClient.invalidateQueries({ queryKey: ["network-nodes", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["customers", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["fibre-cables", tenantId] });
    },
    onError: (error: Error) => toast.error(error.message || "Failed to remove client."),
  });
}

export function useUpdateMstSplitterType() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { mstId: string; splitterType: "1/2" | "1/4" | "1/8" | "1/16" }) =>
      apiClient.updateMstSplitterType(payload, tenantId, token),
    onSuccess: () => {
      toast.success("Splitter configuration updated.");
      queryClient.invalidateQueries({ queryKey: ["network-nodes", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["customers", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["fibre-cables", tenantId] });
    },
    onError: (error: Error) => toast.error(error.message || "Failed to update splitter."),
  });
}
