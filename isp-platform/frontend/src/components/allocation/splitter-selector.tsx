"use client";

import { cn } from "@/lib/utils";
import type { SplitterPort } from "@/types";

type Props = {
  ports: SplitterPort[];
  selectedPort?: number;
  onSelect: (port: number) => void;
  disabled?: boolean;
};

export function SplitterSelector({ ports, selectedPort, onSelect, disabled }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Splitter Port Allocation</p>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {ports.map((port) => (
          <button
            key={port.port}
            type="button"
            disabled={disabled || port.status === "used"}
            onClick={() => onSelect(port.port)}
            className={cn(
              "rounded-lg border p-2 text-xs font-semibold transition",
              port.status === "used"
                ? "cursor-not-allowed border-danger/40 bg-danger/10 text-danger"
                : "border-success/40 bg-success/10 text-success hover:brightness-110",
              selectedPort === port.port ? "ring-2 ring-primary" : "",
            )}
          >
            {port.port}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-success" />
          Free
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-danger" />
          Used
        </span>
      </div>
    </div>
  );
}
