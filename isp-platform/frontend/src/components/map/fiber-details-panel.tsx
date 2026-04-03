import { useMemo } from "react";
import type { FibreCable, NetworkNode } from "@/types";
import { CoreEditor } from "@/components/map/core-editor";
import { CoreListView } from "@/components/map/core-list-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { formatCableDistance } from "@/lib/fibre-routing";

type FiberDetailsPanelProps = {
  open: boolean;
  cable?: FibreCable;
  nodes: NetworkNode[];
  canEdit?: boolean;
  canDelete?: boolean;
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

export function FiberDetailsPanel({
  open,
  cable,
  nodes,
  canEdit = true,
  canDelete = false,
  onOpenChange,
  onAssignCore,
  onSetCoreState,
  onDeleteCable,
}: FiberDetailsPanelProps) {
  const stats = useMemo(() => {
    if (!cable) return { used: 0, free: 0, total: 0 };
    const used = cable.cores.filter((core) => core.status === "used").length;
    const total = cable.coreCount;
    return { used, total, free: Math.max(total - used, 0) };
  }, [cable]);

  const startNode = nodes.find((node) => node.id === cable?.fromNodeId);
  const endNode = nodes.find((node) => node.id === cable?.toNodeId);
  const routeGeometry = cable?.geometry?.length ? cable.geometry : cable?.coordinates ?? [];
  const startCoordinate = cable?.start ?? routeGeometry[0];
  const endCoordinate = cable?.end ?? routeGeometry[routeGeometry.length - 1];
  const routeLabel = cable?.routeMode === "road" ? "Road-following route" : "Straight-line fallback";
  const routeSourceLabel =
    cable?.routeSource === "mapbox-directions"
      ? "Mapbox Directions"
      : cable?.routeSource === "seeded"
        ? "Stored route geometry"
        : "Straight-line fallback";

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title={cable ? cable.name : "Fibre Cable"} description="Core-level engineering controls">
      {cable ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-background/60 p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <p>
                <span className="text-muted-foreground">Fibre type:</span> {cable.coreCount}-core
              </p>
              <Badge variant="outline">{cable.segmentType ?? "distribution"}</Badge>
            </div>
            <p><span className="text-muted-foreground">From node:</span> {startNode?.name ?? cable.fromNodeId}</p>
            <p><span className="text-muted-foreground">To node:</span> {endNode?.name ?? cable.toNodeId}</p>
            <p><span className="text-muted-foreground">Route:</span> {routeLabel}</p>
            <p><span className="text-muted-foreground">Route source:</span> {routeSourceLabel}</p>
            {cable.segmentType === "drop" ? (
              <>
                <p><span className="text-muted-foreground">Client:</span> {cable.clientId ?? "-"}</p>
                <p><span className="text-muted-foreground">Splitter port:</span> {cable.splitterPort ?? "-"}</p>
                <p><span className="text-muted-foreground">Core used:</span> {cable.coreUsed ?? "-"}</p>
              </>
            ) : null}
            <p>
              <span className="text-muted-foreground">Start coordinate:</span>{" "}
              {startCoordinate ? `${startCoordinate.lat.toFixed(5)}, ${startCoordinate.lng.toFixed(5)}` : "-"}
            </p>
            <p>
              <span className="text-muted-foreground">End coordinate:</span>{" "}
              {endCoordinate ? `${endCoordinate.lat.toFixed(5)}, ${endCoordinate.lng.toFixed(5)}` : "-"}
            </p>
            <p><span className="text-muted-foreground">Distance:</span> {formatCableDistance(cable.distanceMeters)}</p>
            <p><span className="text-muted-foreground">Route points:</span> {routeGeometry.length}</p>
            {cable.routeFallbackReason ? (
              <p className="text-xs text-muted-foreground">Fallback reason: {cable.routeFallbackReason}</p>
            ) : null}
          </div>

          <div className="rounded-xl border border-border/70 bg-background/60 p-3 text-sm">
            Core breakdown: {stats.total} total | {stats.used} used | {stats.free} remaining
          </div>

          <CoreListView cores={cable.cores} />
          <CoreEditor
            cable={cable}
            disabled={!canEdit}
            onSetCoreState={(payload) => {
              if (onSetCoreState) {
                onSetCoreState(payload);
                return;
              }
              if (payload.status === "used") {
                onAssignCore?.({ cableId: payload.cableId, coreId: payload.coreId });
              }
            }}
          />

          <div className="rounded-xl border border-danger/40 bg-danger/5 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-danger">Danger Zone</p>
            <Button className="mt-2" variant="danger" disabled={!canDelete || !onDeleteCable} onClick={() => onDeleteCable?.({ cableId: cable.id })}>
              {cable.segmentType === "drop" ? "Delete Client Drop Line" : "Delete Fibre Cable"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Select a fibre cable from the map.</p>
      )}
    </Drawer>
  );
}
