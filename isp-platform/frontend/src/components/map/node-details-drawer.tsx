"use client";

import type { FibreCable, GeoPoint } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Drawer } from "@/components/ui/drawer";

type NodeDetailsDrawerProps = {
  open: boolean;
  node?: {
    id: string;
    name: string;
    location: GeoPoint;
    type?: string;
  };
  cables: FibreCable[];
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
};

export function NodeDetailsDrawer({
  open,
  node,
  cables,
  onOpenChange,
  title,
  description,
  children,
}: NodeDetailsDrawerProps) {
  const connected = node
    ? cables.filter((cable) => cable.fromNodeId === node.id || cable.toNodeId === node.id)
    : [];

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={title ?? (node ? node.name : "Node Details")}
      description={description ?? "Infrastructure details and connected fibre paths"}
    >
      {node ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-background/60 p-3 text-sm">
            <p>
              <span className="text-muted-foreground">Node ID:</span> {node.id}
            </p>
            <p>
              <span className="text-muted-foreground">Coordinates:</span> {node.location.lat.toFixed(5)}, {node.location.lng.toFixed(5)}
            </p>
            <p>
              <span className="text-muted-foreground">Type:</span> {(node.type ?? "node").toUpperCase()}
            </p>
          </div>

          <div className="space-y-2 rounded-xl border border-border/70 bg-background/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Connected Fibres</p>
            <div className="flex flex-wrap gap-2">
              {connected.map((cable) => (
                <Badge key={cable.id} variant="outline">
                  {cable.name}
                </Badge>
              ))}
            </div>
            {connected.length === 0 ? <p className="text-xs text-muted-foreground">No fibre cable linked yet.</p> : null}
          </div>

          {children}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Select an MST or closure marker to inspect details.</p>
      )}
    </Drawer>
  );
}
