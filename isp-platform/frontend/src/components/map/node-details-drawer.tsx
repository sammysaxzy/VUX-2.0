"use client";

import { useEffect, useState } from "react";
import type { FibreCable, GeoPoint } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";

type NodeDetailsDrawerProps = {
  open: boolean;
  node?: {
    id: string;
    name: string;
    location: GeoPoint;
    type?: string;
  };
  cables: FibreCable[];
  nodeLookup?: Record<string, string>;
  historyEntries?: Array<{ id: string; message: string; timestamp: string }>;
  onAddNote?: (payload: { nodeId: string; note: string }) => void;
  canAddNote?: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
};

export function NodeDetailsDrawer({
  open,
  node,
  cables,
  nodeLookup = {},
  historyEntries = [],
  onAddNote,
  canAddNote = true,
  onOpenChange,
  title,
  description,
  children,
}: NodeDetailsDrawerProps) {
  const connected = node
    ? cables.filter((cable) => cable.fromNodeId === node.id || cable.toNodeId === node.id)
    : [];
  const incoming = node ? connected.filter((cable) => cable.toNodeId === node.id) : [];
  const outgoing = node ? connected.filter((cable) => cable.fromNodeId === node.id) : [];
  const history = historyEntries.slice(0, 6);
  const resolveNodeName = (nodeId?: string) => (nodeId ? nodeLookup[nodeId] ?? nodeId : "-");
  const [note, setNote] = useState("");
  const canSubmitNote = Boolean(note.trim()) && Boolean(onAddNote) && Boolean(node) && canAddNote;

  useEffect(() => {
    if (!open) setNote("");
  }, [open]);

  useEffect(() => {
    setNote("");
  }, [node?.id]);

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
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Basic Info</p>
            <div className="mt-2 grid gap-1">
              <p>
                <span className="text-muted-foreground">Name:</span> {node.name}
              </p>
              <p>
                <span className="text-muted-foreground">Type:</span> {(node.type ?? "node").toUpperCase()}
              </p>
              <p>
                <span className="text-muted-foreground">Coordinates:</span> {node.location.lat.toFixed(5)}, {node.location.lng.toFixed(5)}
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-border/70 bg-background/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Incoming Cables (Power)</p>
              <div className="mt-2 space-y-1 text-sm text-foreground">
                {incoming.map((cable) => (
                  <p key={cable.id}>
                    {cable.coreCount}-core from {resolveNodeName(cable.fromNodeId)}
                  </p>
                ))}
              </div>
              {incoming.length === 0 ? <p className="mt-2 text-xs text-muted-foreground">No incoming cables yet.</p> : null}
            </div>

            <div className="rounded-xl border border-border/70 bg-background/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Outgoing Cables (Distribution)</p>
              <div className="mt-2 space-y-1 text-sm text-foreground">
                {outgoing.map((cable) => (
                  <p key={cable.id}>
                    {cable.coreCount}-core to {resolveNodeName(cable.toNodeId)}
                  </p>
                ))}
              </div>
              {outgoing.length === 0 ? <p className="mt-2 text-xs text-muted-foreground">No outgoing cables yet.</p> : null}
            </div>
          </div>

          {children}

          <div className="rounded-xl border border-border/70 bg-background/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Work History</p>
            {onAddNote && node ? (
              <div className="mt-2 grid gap-2">
                <Textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Field notes for this location"
                  className="min-h-[80px]"
                  disabled={!canAddNote}
                />
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-muted-foreground">Notes are saved to the work history timeline.</p>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!canSubmitNote}
                    onClick={() => {
                      if (!node || !onAddNote) return;
                      const trimmed = note.trim();
                      if (!trimmed) return;
                      onAddNote({ nodeId: node.id, note: trimmed });
                      setNote("");
                    }}
                  >
                    Save Note
                  </Button>
                </div>
              </div>
            ) : null}
            <div className="mt-2 space-y-2 text-xs text-muted-foreground">
              {history.map((entry) => (
                <div key={entry.id} className="flex gap-2 rounded-lg border border-border/60 bg-background/70 px-2 py-1.5">
                  <span className="mt-1 h-2 w-2 rounded-full bg-muted-foreground" />
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{entry.timestamp}</p>
                    <p className="mt-1 text-sm text-foreground">{entry.message}</p>
                  </div>
                </div>
              ))}
              {history.length === 0 ? <p>No recent activity logged.</p> : null}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Select an MST or closure marker to inspect details.</p>
      )}
    </Drawer>
  );
}
