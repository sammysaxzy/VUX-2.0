"use client";

import { Link } from "react-router-dom";
import type { Customer, FibreCable, NetworkNode } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";

type CoreTrace = {
  cableId: string;
  cableName: string;
  coreLabel: string;
  usagePath?: string;
};

type ClientDropDetailsDrawerProps = {
  open: boolean;
  node?: NetworkNode;
  customer?: Customer;
  cables: FibreCable[];
  canDelete?: boolean;
  onOpenChange: (open: boolean) => void;
  onReleaseConnection?: (payload: { mstId: string; portNumber: number }) => void;
};

function onlineBadge(online: boolean) {
  return online ? <Badge variant="success">Online</Badge> : <Badge variant="danger">Offline</Badge>;
}

export function ClientDropDetailsDrawer({
  open,
  node,
  customer,
  cables,
  canDelete = false,
  onOpenChange,
  onReleaseConnection,
}: ClientDropDetailsDrawerProps) {
  const relatedCables = node
    ? cables.filter(
        (cable) =>
          cable.fromNodeId === node.id ||
          cable.toNodeId === node.id ||
          (customer ? cable.cores.some((core) => core.assignedToCustomerId === customer.id) : false),
      )
    : [];

  const coreTraces: CoreTrace[] = customer
    ? cables.flatMap((cable) =>
        cable.cores
          .filter((core) => core.assignedToCustomerId === customer.id)
          .map((core) => ({
            cableId: cable.id,
            cableName: cable.name,
            coreLabel: core.label,
            usagePath: core.usagePath,
          })),
      )
    : [];

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title={node ? node.name : "Client Drop"} description="Client drop endpoint details and control">
      {node ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-background/60 p-3 text-sm">
            <p>
              <span className="text-muted-foreground">Node ID:</span> {node.id}
            </p>
            <p>
              <span className="text-muted-foreground">Coordinates:</span> {node.location.lat.toFixed(5)}, {node.location.lng.toFixed(5)}
            </p>
            <div className="mt-2">
              <Badge variant={node.status === "fault" ? "danger" : node.status === "warning" ? "warning" : "success"}>
                {node.status}
              </Badge>
            </div>
          </div>

          {customer ? (
            <div className="space-y-2 rounded-xl border border-border/70 bg-background/60 p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">{customer.name}</p>
                <div className="flex items-center gap-2">
                  {onlineBadge(customer.online)}
                  <Badge variant={customer.accountStatus === "active" ? "success" : "warning"}>{customer.accountStatus}</Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{customer.email}</p>
              <p>
                <span className="text-muted-foreground">ONU:</span> {customer.onuSerial}
              </p>
              <p>
                <span className="text-muted-foreground">OLT/PON:</span> {customer.oltName} / {customer.ponPort}
              </p>
              <p>
                <span className="text-muted-foreground">Signals RX/TX:</span> {customer.rxSignal} dBm / {customer.txSignal} dBm
              </p>
              <p>
                <span className="text-muted-foreground">MST/Port:</span> {customer.mstId ?? "-"} / {customer.splitterPort ?? "-"}
              </p>
              <p>
                <span className="text-muted-foreground">Assigned core:</span> {customer.fibreCoreId ?? "-"}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {customer.mstId && customer.splitterPort && onReleaseConnection ? (
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={!canDelete}
                    onClick={() =>
                      onReleaseConnection({
                        mstId: customer.mstId as string,
                        portNumber: customer.splitterPort as number,
                      })
                    }
                  >
                    Release From MST Port
                  </Button>
                ) : null}
                <Link to={`/customers/${customer.id}`}>
                  <Button size="sm" variant="outline">
                    Open CRM Profile
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border/70 bg-background/60 p-3 text-sm text-muted-foreground">
              No CRM customer linked to this drop marker yet.
            </div>
          )}

          <div className="space-y-2 rounded-xl border border-border/70 bg-background/60 p-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Related Cables</p>
            {relatedCables.map((cable) => (
              <div key={cable.id} className="rounded-lg border border-border/60 px-2 py-1.5 text-xs">
                <p className="font-medium">{cable.name}</p>
                <p className="text-muted-foreground">
                  {cable.coreCount}-core | {cable.distanceMeters}m
                </p>
              </div>
            ))}
            {relatedCables.length === 0 ? <p className="text-xs text-muted-foreground">No cable linked yet.</p> : null}
          </div>

          <div className="space-y-2 rounded-xl border border-border/70 bg-background/60 p-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Core Trace</p>
            {coreTraces.map((trace) => (
              <div key={`${trace.cableId}-${trace.coreLabel}`} className="rounded-lg border border-border/60 px-2 py-1.5 text-xs">
                <p>
                  {trace.coreLabel} on {trace.cableName}
                </p>
                {trace.usagePath ? <p className="text-muted-foreground">{trace.usagePath}</p> : null}
              </div>
            ))}
            {coreTraces.length === 0 ? <p className="text-xs text-muted-foreground">No core currently assigned to this client.</p> : null}
            {customer?.mstId ? (
              <p className="text-[11px] text-muted-foreground">Edit location, splitter port, core, and route from the MST drawer.</p>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Select a client drop marker to inspect details.</p>
      )}
    </Drawer>
  );
}
