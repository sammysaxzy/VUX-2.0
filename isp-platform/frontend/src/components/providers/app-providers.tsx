"use client";

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";
import { createQueryClient } from "@/lib/query-client";
import { ThemeSync } from "@/components/providers/theme-sync";
import { RealtimeProvider } from "@/components/providers/realtime-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeSync />
      <RealtimeProvider>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </RealtimeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
