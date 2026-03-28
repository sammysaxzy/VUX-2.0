
import { useMemo } from "react";
import type { FibreCable, NetworkNode } from "@/types";
import { CoreEditor } from "@/components/map/core-editor";
import { CoreListView } from "@/components/map/core-list-view";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

type FiberDetailsPanelProps = {
  open: boolean;
  cable?: FibreCable;
  nodes: NetworkNode[];
  onOpenChange: (open: boolean) => void;
  onAssignCore?: (payload: { cableId: string; coreId: string }) => void;
  onSetCoreState?: (payload: {
    cableId: string;
    coreId: string;
    status: "free" | "used";
    fromMstId?: string;
    toMstId?: string;
    usagePath?: string;
    assignedToCustomerId?: string;
  }) => void;
  onDeleteCable?: (payload: { cableId: string }) => void;
};

export function FiberDetailsPanel({ open, cable, nodes, onOpenChange, onAssignCore, onSetCoreState, onDeleteCable }: FiberDetailsPanelProps) {
  const stats = useMemo(() => {
    if (!cable) return { used: 0, free: 0, total: 0 };
    const used = cable.cores.filter((core) => core.status === "used").length;
    const total = cable.coreCount;
    return { used, total, free: Math.max(total - used, 0) };
  }, [cable]);

  const startNode = nodes.find((node) => node.id === cable?.fromNodeId);
  const endNode = nodes.find((node) => node.id === cable?.toNodeId);
  const startCoordinate = cable?.coordinates[0];
  const endCoordinate = cable?.coordinates[cable.coordinates.length - 1];

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title={cable ? cable.name : "Fibre Cable"} description="Core-level engineering controls">
      {cable ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-background/60 p-3 text-sm">
            <p><span className="text-muted-foreground">Fibre type:</span> {cable.coreCount}-core</p>
            <p><span className="text-muted-foreground">From MST:</span> {startNode?.name ?? cable.fromNodeId}</p>
            <p><span className="text-muted-foreground">To MST:</span> {endNode?.name ?? cable.toNodeId}</p>
            <p>
              <span className="text-muted-foreground">Start coordinate:</span>{" "}
              {startCoordinate ? `${startCoordinate.lat.toFixed(5)}, ${startCoordinate.lng.toFixed(5)}` : "-"}
            </p>
            <p>
              <span className="text-muted-foreground">End coordinate:</span>{" "}
              {endCoordinate ? `${endCoordinate.lat.toFixed(5)}, ${endCoordinate.lng.toFixed(5)}` : "-"}
            </p>
            <p><span className="text-muted-foreground">Distance:</span> {cable.distanceMeters}m</p>
          </div>

          <div className="rounded-xl border border-border/70 bg-background/60 p-3 text-sm">
            {stats.total} cores total | {stats.used} used | {stats.free} remaining
          </div>

          <CoreListView cores={cable.cores} />
          <CoreEditor cable={cable} onSetCoreState={(payload) => { if (onSetCoreState) { onSetCoreState(payload); return; } if (payload.status === "used") { onAssignCore?.({ cableId: payload.cableId, coreId: payload.coreId }); } }} />

          <div className="rounded-xl border border-danger/40 bg-danger/5 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-danger">Danger Zone</p>
            <Button className="mt-2" variant="danger" disabled={!onDeleteCable} onClick={() => onDeleteCable?.({ cableId: cable.id })}>
              Delete Fibre Cable
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Select a fibre cable from the map.</p>
      )}
    </Drawer>
  );
}






