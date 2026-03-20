"use client";

import { useMemo, useState } from "react";
import type { FibreCable, NetworkNode } from "@/types";
import { CoreList } from "@/components/map/core-list";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

type FibreDetailsModalProps = {
  open: boolean;
  cable?: FibreCable;
  nodes: NetworkNode[];
  onOpenChange: (open: boolean) => void;
  onAssignCore?: (payload: { cableId: string; coreId: string }) => void;
};

export function FibreDetailsModal({ open, cable, nodes, onOpenChange, onAssignCore }: FibreDetailsModalProps) {
  const [selectedCoreId, setSelectedCoreId] = useState<string>("");

  const capacity = useMemo(() => {
    if (!cable) return { total: 0, used: 0, free: 0 };
    const total = cable.coreCount;
    const used = cable.cores.filter((core) => core.status === "used").length;
    return { total, used, free: Math.max(total - used, 0) };
  }, [cable]);

  const startNode = nodes.find((node) => node.id === cable?.fromNodeId);
  const endNode = nodes.find((node) => node.id === cable?.toNodeId);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={cable ? `Fibre Details - ${cable.name}` : "Fibre Details"}
      description="Core-level usage, cable path, and capacity."
    >
      {cable ? (
        <div className="space-y-4">
          <div className="grid gap-2 rounded-xl border border-border/70 bg-background/60 p-3 text-sm sm:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Fibre type:</span> {cable.coreCount}-core
            </p>
            <p>
              <span className="text-muted-foreground">Distance:</span> {cable.distanceMeters}m
            </p>
            <p>
              <span className="text-muted-foreground">Start MST:</span> {startNode?.name ?? cable.fromNodeId}
            </p>
            <p>
              <span className="text-muted-foreground">End MST:</span> {endNode?.name ?? cable.toNodeId}
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-background/60 p-3 text-sm">
            {capacity.total} cores total | {capacity.used} used | {capacity.free} remaining
          </div>

          <CoreList cores={cable.cores} />

          <div className="space-y-2 rounded-xl border border-border/70 bg-background/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Assign Core</p>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={selectedCoreId} onChange={(event) => setSelectedCoreId(event.target.value)}>
                <option value="">Select free core</option>
                {cable.cores
                  .filter((core) => core.status === "free")
                  .map((core) => (
                    <option key={core.id} value={core.id}>
                      {core.label}
                    </option>
                  ))}
              </Select>
              <Button
                disabled={!selectedCoreId}
                onClick={() => {
                  if (!selectedCoreId) return;
                  onAssignCore?.({ cableId: cable.id, coreId: selectedCoreId });
                  setSelectedCoreId("");
                }}
              >
                Mark As Used
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No cable selected.</p>
      )}
    </Dialog>
  );
}
