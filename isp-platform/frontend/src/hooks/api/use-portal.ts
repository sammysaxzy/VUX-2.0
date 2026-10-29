"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import type { CustomerPayment, CustomerTicket, CustomerTicketCategory } from "@/types";

export function usePortalProfile(customerId?: string, token?: string, tenantId?: string) {
  return useQuery({
    queryKey: ["portal-profile", tenantId, customerId],
    queryFn: () => apiClient.getCustomerPortalProfile(customerId as string, token),
    enabled: Boolean(customerId && token),
  });
}

export function usePortalPlans(token?: string, tenantId?: string) {
  return useQuery({
    queryKey: ["portal-plans", tenantId, Boolean(token)],
    queryFn: () => apiClient.getCustomerPortalPlans(token),
    enabled: Boolean(token),
  });
}

export function usePortalTickets(customerId?: string, token?: string, tenantId?: string) {
  return useQuery({
    queryKey: ["portal-tickets", tenantId, customerId],
    queryFn: () => apiClient.getCustomerPortalTickets(customerId as string, token),
    enabled: Boolean(customerId && token),
  });
}

export function usePortalNotifications(customerId?: string, token?: string, tenantId?: string) {
  return useQuery({
    queryKey: ["portal-notifications", tenantId, customerId],
    queryFn: () => apiClient.getCustomerPortalNotifications(customerId as string, token),
    enabled: Boolean(customerId && token),
  });
}

export function usePortalPayments(customerId?: string, token?: string, tenantId?: string) {
  return useQuery({
    queryKey: ["portal-payments", tenantId, customerId],
    queryFn: () => apiClient.getCustomerPortalPayments(customerId as string, token),
    enabled: Boolean(customerId && token),
  });
}

export function usePortalUsage(customerId?: string, token?: string, tenantId?: string) {
  return useQuery({
    queryKey: ["portal-usage", tenantId, customerId],
    queryFn: () => apiClient.getCustomerPortalUsage(customerId as string, token),
    enabled: Boolean(customerId && token),
  });
}

export function usePortalCreateTicket(customerId?: string, token?: string, tenantId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { subject: string; description: string; category: CustomerTicketCategory }) =>
      apiClient.createCustomerPortalTicket(customerId as string, payload, token),
    onSuccess: () => {
      toast.success("Complaint submitted.");
      queryClient.invalidateQueries({ queryKey: ["portal-tickets", tenantId, customerId] });
    },
    onError: () => toast.error("Unable to submit complaint."),
  });
}

export function usePortalUpdateTicket(customerId?: string, token?: string, tenantId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { ticketId: string; status: CustomerTicket["status"]; note?: string }) =>
      apiClient.updateCustomerPortalTicket(customerId as string, payload, token),
    onSuccess: () => {
      toast.success("Ticket updated.");
      queryClient.invalidateQueries({ queryKey: ["portal-tickets", tenantId, customerId] });
    },
    onError: () => toast.error("Unable to update ticket."),
  });
}

export function usePortalCreatePayment(customerId?: string, token?: string, tenantId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { planId: string; method: CustomerPayment["method"] }) =>
      apiClient.createCustomerPortalPayment(customerId as string, payload, token),
    onSuccess: () => {
      toast.success("Payment request created.");
      queryClient.invalidateQueries({ queryKey: ["portal-payments", tenantId, customerId] });
      queryClient.invalidateQueries({ queryKey: ["portal-profile", tenantId, customerId] });
    },
    onError: () => toast.error("Unable to create payment request."),
  });
}

export function usePortalUpgradePlan(customerId?: string, token?: string, tenantId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { planId: string }) => apiClient.upgradeCustomerPortalPlan(customerId as string, payload, token),
    onSuccess: () => {
      toast.success("Plan change request submitted.");
      queryClient.invalidateQueries({ queryKey: ["portal-profile", tenantId, customerId] });
    },
    onError: () => toast.error("Unable to submit plan change request."),
  });
}

export function usePortalChangePassword(token?: string) {
  return useMutation({
    mutationFn: (payload: { currentPassword: string; newPassword: string }) =>
      apiClient.changeCustomerPortalPassword(payload, token),
    onSuccess: () => toast.success("Password updated."),
    onError: () => toast.error("Unable to update password."),
  });
}
