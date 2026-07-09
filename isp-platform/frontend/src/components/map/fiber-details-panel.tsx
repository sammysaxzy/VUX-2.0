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
    status: "free" | "used" | "reserved";
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
    if (!cable) return { used: 0, free: 0, reserved: 0, damaged: 0, dark: 0, total: 0 };
    const used = cable.cores.filter((core) => core.status === "used").length;
    const reserved = cable.cores.filter((core) => core.status === "reserved").length;
    const damaged = cable.cores.filter((core) => core.status === "damaged" || core.status === "faulty").length;
    const dark = cable.cores.filter((core) => core.status === "dark").length;
    const total = cable.coreCount;
    const free = cable.cores.filter((core) => core.status === "free").length;
    return { used, total, free, reserved, damaged, dark };
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
            <p><span className="text-muted-foreground">Cable class:</span> {cable.cableType ?? `${cable.coreCount}-core cable`}</p>
            <p><span className="text-muted-foreground">Route status:</span> {cable.routeStatus ?? "existing"}</p>
            <p><span className="text-muted-foreground">Installation method:</span> {cable.installationMethod ?? "underground"}</p>
            <p><span className="text-muted-foreground">Owner:</span> {cable.owner ?? "Internal network"}</p>
            <p><span className="text-muted-foreground">Install date:</span> {cable.installDate ?? "-"}</p>
            <p><span className="text-muted-foreground">From node:</span> {startNode?.name ?? cable.fromNodeId}</p>
            <p><span className="text-muted-foreground">To node:</span> {endNode?.name ?? cable.toNodeId}</p>
            <p><span className="text-muted-foreground">Route:</span> {routeLabel}</p>
            <p><span className="text-muted-foreground">Route source:</span> {routeSourceLabel}</p>
            {cable.depthMeters ? <p><span className="text-muted-foreground">Burial depth:</span> {cable.depthMeters.toFixed(1)} m</p> : null}
            {cable.heightMeters ? <p><span className="text-muted-foreground">Aerial height:</span> {cable.heightMeters.toFixed(1)} m</p> : null}
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
            {cable.notes ? <p className="text-xs text-muted-foreground">Notes: {cable.notes}</p> : null}
          </div>

          <div className="rounded-xl border border-border/70 bg-background/60 p-3 text-sm">
            Core breakdown: {stats.total} total | {stats.used} used | {stats.free} free | {stats.reserved} reserved | {stats.dark} dark | {stats.damaged} damaged
          </div>

          <div className="rounded-xl border border-border/70 bg-background/60 p-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Slack Loop Management</p>
            <div className="mt-2 space-y-2">
              {(cable.slackLoops ?? []).map((loop) => (
                <div key={loop.id} className="rounded-lg border border-border/60 bg-background/80 p-2 text-xs">
                  <p className="font-medium">{loop.location}</p>
                  <p className="mt-1 text-muted-foreground">
                    {loop.lengthMeters} m slack | {loop.loopCount} loop(s) | {loop.coilDiameterMeters} m coil
                  </p>
                  {loop.note ? <p className="mt-1 text-muted-foreground">{loop.note}</p> : null}
                </div>
              ))}
              {(cable.slackLoops ?? []).length === 0 ? <p className="text-xs text-muted-foreground">No slack loop record captured yet for this cable.</p> : null}
            </div>
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
