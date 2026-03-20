"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { useAppStore } from "@/store/app-store";

export function useLoginMutation() {
  const setAuth = useAppStore((state) => state.setAuth);
  return useMutation({
    mutationFn: (payload: { email: string; password: string; tenantId: string }) =>
      apiClient.login(payload.email, payload.password, payload.tenantId),
    onSuccess: (response) => {
      setAuth(response);
      toast.success(`Welcome to ${response.branding.ispName}`);
    },
    onError: () => {
      toast.error("Login failed. Check tenant ID and credentials.");
    },
  });
}

export function useRegisterMutation() {
  const setAuth = useAppStore((state) => state.setAuth);
  return useMutation({
    mutationFn: apiClient.register,
    onSuccess: (response) => {
      setAuth(response);
      toast.success("Tenant workspace created.");
    },
    onError: () => {
      toast.error("Registration failed.");
    },
  });
}
