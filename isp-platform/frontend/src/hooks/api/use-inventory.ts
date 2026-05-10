"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { useAppStore, useTenantId } from "@/store/app-store";
import type { InventoryItem, InventoryMovement, InventoryPurchase, WorkOrder } from "@/types";

export function useInventorySummary() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["inventory-summary", tenantId],
    queryFn: () => apiClient.getInventorySummary(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useInventoryItems(search?: string, lowStockOnly?: boolean) {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["inventory-items", tenantId, search, lowStockOnly],
    queryFn: () => apiClient.getInventoryItems(tenantId, token, search, lowStockOnly),
    enabled: Boolean(tenantId),
  });
}

export function useInventoryMovements() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["inventory-movements", tenantId],
    queryFn: () => apiClient.getInventoryMovements(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useSuppliers() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["inventory-suppliers", tenantId],
    queryFn: () => apiClient.getSuppliers(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useInventoryPurchases() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["inventory-purchases", tenantId],
    queryFn: () => apiClient.getInventoryPurchases(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useWorkOrders() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  return useQuery({
    queryKey: ["work-orders", tenantId],
    queryFn: () => apiClient.getWorkOrders(tenantId, token),
    enabled: Boolean(tenantId),
  });
}

export function useCreateInventoryItem() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<InventoryItem, "id" | "is_active" | "created_at" | "updated_at">) =>
      apiClient.createInventoryItem(payload, tenantId, token),
    onSuccess: () => {
      toast.success("Inventory item created.");
      queryClient.invalidateQueries({ queryKey: ["inventory-items", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-summary", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", tenantId] });
    },
    onError: () => toast.error("Unable to create inventory item."),
  });
}

export function useCreateInventoryMovement() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      payload: Omit<InventoryMovement, "id" | "created_at" | "total_cost" | "used_by_user_id" | "latitude" | "longitude">,
    ) => apiClient.createInventoryMovement(payload, tenantId, token),
    onSuccess: () => {
      toast.success("Inventory movement recorded.");
      queryClient.invalidateQueries({ queryKey: ["inventory-items", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-movements", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-summary", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", tenantId] });
    },
    onError: () => toast.error("Unable to record inventory movement."),
  });
}

export function useCreateInventoryPurchase() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      supplier_id?: number;
      purchase_date?: string;
      notes?: string;
      reference_id?: string;
      lines: Array<{ item_id: number; quantity: number; unit_cost: number; notes?: string }>;
    }) => apiClient.createInventoryPurchase(payload, tenantId, token),
    onSuccess: () => {
      toast.success("Purchase recorded and posted to finance.");
      queryClient.invalidateQueries({ queryKey: ["inventory-items", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-movements", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-summary", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-purchases", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["finance-summary", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["finance-transactions", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", tenantId] });
    },
    onError: () => toast.error("Unable to record purchase."),
  });
}

export function useCreateWorkOrder() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      work_type: WorkOrder["work_type"];
      inventory_deduction_mode: WorkOrder["inventory_deduction_mode"];
      title: string;
      description?: string;
      customer_name?: string;
      service_address?: string;
      client_id?: number;
      mst_id?: number;
      fibre_route_id?: number;
      assigned_engineer_user_id?: number;
      onu_serial?: string;
      onu_mac?: string;
      router_mac?: string;
      installation_fee?: number;
      latitude?: number;
      longitude?: number;
      map_reference?: string;
      notes?: string;
      photos?: string[];
      scheduled_at?: string;
      materials: Array<{
        item_id: number;
        quantity_planned: number;
        quantity_used?: number;
        unit_cost?: number;
        serial_number?: string;
        mac_address?: string;
        cable_length_used?: number;
        notes?: string;
      }>;
    }) => apiClient.createWorkOrder(payload, tenantId, token),
    onSuccess: () => {
      toast.success("Work order created.");
      queryClient.invalidateQueries({ queryKey: ["work-orders", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-summary", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", tenantId] });
    },
    onError: () => toast.error("Unable to create work order."),
  });
}

export function useApproveWorkOrderUsage() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workOrderId, approvalNotes }: { workOrderId: number; approvalNotes?: string }) =>
      apiClient.approveWorkOrderUsage(workOrderId, approvalNotes, tenantId, token),
    onSuccess: () => {
      toast.success("Work order usage approved.");
      queryClient.invalidateQueries({ queryKey: ["work-orders", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-items", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-movements", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-summary", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["finance-summary", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["finance-transactions", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", tenantId] });
    },
    onError: () => toast.error("Unable to approve work order usage."),
  });
}
