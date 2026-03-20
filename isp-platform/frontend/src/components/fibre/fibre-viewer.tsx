"use client";

import { Cable } from "lucide-react";
import type { FibreCore } from "@/types";
import { cn } from "@/lib/utils";

type Props = {
  cores: FibreCore[];
  selectedCoreId?: string;
  onSelect?: (coreId: string) => void;
};

export function FibreViewer({ cores, selectedCoreId, onSelect }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Cable className="h-4 w-4 text-primary" />
        <p className="text-sm font-medium">Fibre Core Picker</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {cores.map((core) => (
          <button
            key={core.id}
            type="button"
            disabled={core.status === "used" && !core.assignedToCustomerId}
            onClick={() => onSelect?.(core.id)}
            className={cn(
              "rounded-xl border p-2 text-left text-xs transition",
              selectedCoreId === core.id ? "ring-2 ring-primary" : "",
              core.status === "faulty" ? "border-danger/50 bg-danger/10" : "border-border bg-background/60",
            )}
          >
            <div className="mb-1 flex items-center gap-2">
              <span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: core.color }} />
              <span className="font-semibold">{core.label}</span>
            </div>
            <p className="uppercase text-[10px] text-muted-foreground">{core.status}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
