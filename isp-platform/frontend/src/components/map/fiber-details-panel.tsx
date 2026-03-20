"use client";

import { useMemo, useState } from "react";
import type { FibreCable, NetworkNode } from "@/types";
import { CoreListView } from "@/components/map/core-list-view";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

type FiberDetailsPanelProps = {
  open: boolean;
  cable?: FibreCable;
  nodes: NetworkNode[];
  onOpenChange: (open: boolean) => void;
  onAssignCore?: (payload: { cableId: string; coreId: string }) => void;
};

export function FiberDetailsPanel({ open, cable, nodes, onOpenChange, onAssignCore }: FiberDetailsPanelProps) {
  const [selectedCoreId, setSelectedCoreId] = useState("");

  const stats = useMemo(() => {
    if (!cable) return { used: 0, free: 0, total: 0 };
    const used = cable.cores.filter((core) => core.status === "used").length;
    const total = cable.coreCount;
    return { used, total, free: Math.max(total - used, 0) };
  }, [cable]);

  const startNode = nodes.find((node) => node.id === cable?.fromNodeId);
  const endNode = nodes.find((node) => node.id === cable?.toNodeId);

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title={cable ? cable.name : "Fibre Cable"} description="Fibre core and capacity details">
      {cable ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-background/60 p-3 text-sm">
            <p>
              <span className="text-muted-foreground">Fibre type:</span> {cable.coreCount}-core
            </p>
            <p>
              <span className="text-muted-foreground">Start MST:</span> {startNode?.name ?? cable.fromNodeId}
            </p>
            <p>
              <span className="text-muted-foreground">End MST:</span> {endNode?.name ?? cable.toNodeId}
            </p>
            <p>
              <span className="text-muted-foreground">Distance:</span> {cable.distanceMeters}m
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-background/60 p-3 text-sm">
            {stats.total} cores total | {stats.used} used | {stats.free} free
          </div>

          <CoreListView cores={cable.cores} />

          <div className="space-y-2 rounded-xl border border-border/70 bg-background/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Update Core Usage</p>
            <div className="flex items-center gap-2">
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
                Mark Used
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Select a fibre cable from the map.</p>
      )}
    </Drawer>
  );
}
