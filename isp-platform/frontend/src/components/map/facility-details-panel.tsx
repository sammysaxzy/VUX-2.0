"use client";

import { useMemo, useState } from "react";
import type { FacilityCableLink, FacilitySplice, FibreCable, NetworkNode } from "@/types";
import { buildBufferGroups } from "@/lib/fibre-buffers";
import { formatCableDistance } from "@/lib/fibre-routing";
import { CoreEditor } from "@/components/map/core-editor";
import { CoreListView } from "@/components/map/core-list-view";
import { NodeDetailsDrawer } from "@/components/map/node-details-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { randomId } from "@/lib/utils";

type FacilityDetailsPanelProps = {
  open: boolean;
  node?: NetworkNode;
  cables: FibreCable[];
  canEdit?: boolean;
  canDelete?: boolean;
  historyEntries?: Array<{ id: string; message: string; timestamp: string }>;
  nodeLookup?: Record<string, string>;
  onAddNote?: (payload: { nodeId: string; note: string }) => void;
  canAddNote?: boolean;
  onOpenChange: (open: boolean) => void;
  onAttachCable: (payload: { nodeId: string; link: FacilityCableLink }) => void;
  onDetachCable: (payload: { nodeId: string; cableId: string }) => void;
  onUpsertSplice: (payload: { nodeId: string; splice: FacilitySplice }) => void;
  onDeleteSplice: (payload: { nodeId: string; spliceId: string }) => void;
  onDeleteNode?: (payload: { nodeId: string }) => void;
  onSetCoreState: (payload: {
    cableId: string;
    coreId: string;
    status: "free" | "used";
    fromMstId?: string;
    toMstId?: string;
    usagePath?: string;
    assignedToCustomerId?: string;
  }) => void;
  title: string;
  description: string;
};

export function FacilityDetailsPanel({
  open,
  node,
  cables,
  canEdit = true,
  canDelete = false,
  historyEntries,
  nodeLookup,
  onAddNote,
  canAddNote = true,
  onOpenChange,
  onAttachCable,
  onDetachCable,
  onUpsertSplice,
  onDeleteSplice,
  onDeleteNode,
  onSetCoreState,
  title,
  description,
}: FacilityDetailsPanelProps) {
  const [attachCableId, setAttachCableId] = useState("");
  const [activeCableId, setActiveCableId] = useState("");
  const [fromCableId, setFromCableId] = useState("");
  const [toCableId, setToCableId] = useState("");
  const [fromCoreLabel, setFromCoreLabel] = useState("");
  const [toCoreLabel, setToCoreLabel] = useState("");
  const [spliceNotes, setSpliceNotes] = useState("");

  const linkedCableIds = useMemo(
    () => new Set(node?.facilityCables?.map((link) => link.cableId) ?? []),
    [node?.facilityCables],
  );
  const connectedByEndpoint = useMemo(() => {
    if (!node) return [] as FibreCable[];
    return cables.filter((cable) => cable.fromNodeId === node.id || cable.toNodeId === node.id);
  }, [cables, node]);
  const linkedCables = useMemo(
    () => cables.filter((cable) => linkedCableIds.has(cable.id)),
    [cables, linkedCableIds],
  );

  const facilityCables = useMemo(() => {
    const merged = [...connectedByEndpoint, ...linkedCables];
    return merged.filter((item, index, list) => list.findIndex((entry) => entry.id === item.id) === index);
  }, [connectedByEndpoint, linkedCables]);

  const availableCableOptions = cables.filter((cable) => !linkedCableIds.has(cable.id));
  const activeCable = facilityCables.find((cable) => cable.id === activeCableId) ?? facilityCables[0];
  const facilitySplices = node?.facilitySplices ?? [];

  return (
    <NodeDetailsDrawer
      open={open}
      onOpenChange={onOpenChange}
      historyEntries={historyEntries}
      nodeLookup={nodeLookup}
      onAddNote={onAddNote}
      canAddNote={canAddNote}
      node={
        node
          ? {
              id: node.id,
              name: node.name,
              location: node.location,
              type: node.type,
            }
          : undefined
      }
      cables={cables}
      title={title}
      description={description}
    >
      {node ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-background/60 p-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Facility Cables</p>
            {facilityCables.map((cable) => {
              const buffers = buildBufferGroups(cable);
              const totalUsed = buffers.reduce((sum, buffer) => sum + buffer.used, 0);
              const totalFree = buffers.reduce((sum, buffer) => sum + buffer.free, 0);
              return (
                <div key={cable.id} className="mt-2 rounded-lg border border-border/70 bg-background/70 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{cable.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {cable.coreCount}-core • {formatCableDistance(cable.distanceMeters)}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setActiveCableId(cable.id)}>
                      View
                    </Button>
                  </div>
                  <div className="mt-2 grid gap-1 text-[11px] text-muted-foreground">
                    <p>Buffers: {buffers.length}</p>
                    <p>Used cores: {totalUsed}</p>
                    <p>Free cores: {totalFree}</p>
                  </div>
                </div>
              );
            })}
            {facilityCables.length === 0 ? <p className="mt-2 text-xs text-muted-foreground">No cable linked yet.</p> : null}
          </div>

          <div className="rounded-xl border border-border/70 bg-background/60 p-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Attach Cable</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Select value={attachCableId} disabled={!canEdit} onChange={(event) => setAttachCableId(event.target.value)}>
                <option value="">Select cable</option>
                {availableCableOptions.map((cable) => (
                  <option key={cable.id} value={cable.id}>
                    {cable.name} ({cable.coreCount}-core)
                  </option>
                ))}
              </Select>
              <Button
                size="sm"
                disabled={!attachCableId || !canEdit}
                onClick={() => {
                  if (!attachCableId) return;
                  onAttachCable({ nodeId: node.id, link: { cableId: attachCableId } });
                  setAttachCableId("");
                }}
              >
                Attach
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!activeCable?.id || !canEdit}
                onClick={() => {
                  if (!activeCable?.id) return;
                  onDetachCable({ nodeId: node.id, cableId: activeCable.id });
                }}
              >
                Detach
              </Button>
            </div>
          </div>

          {activeCable ? (
            <div className="space-y-2 rounded-xl border border-border/70 bg-background/60 p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Buffer Breakdown</p>
              <div className="grid gap-2">
                {buildBufferGroups(activeCable).map((buffer) => (
                  <div key={buffer.id} className="rounded-lg border border-border/70 bg-background/80 p-2">
                    <p className="text-xs font-semibold">{buffer.label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {buffer.cores.length} cores • {buffer.used} used • {buffer.free} free • {buffer.faulty} faulty
                    </p>
                  </div>
                ))}
              </div>
              <CoreListView cores={activeCable.cores} />
              <CoreEditor cable={activeCable} disabled={!canEdit} onSetCoreState={onSetCoreState} />
            </div>
          ) : null}

          <div className="rounded-xl border border-border/70 bg-background/60 p-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Splice Records</p>
            <div className="mt-2 grid gap-2">
              {facilitySplices.map((splice) => (
                <div key={splice.id} className="rounded-lg border border-border/70 bg-background/80 p-2 text-[11px]">
                  <p>
                    {splice.fromCableId} {splice.fromCoreLabel} → {splice.toCableId} {splice.toCoreLabel}
                  </p>
                  {splice.notes ? <p className="text-muted-foreground">{splice.notes}</p> : null}
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    disabled={!canEdit}
                    onClick={() => onDeleteSplice({ nodeId: node.id, spliceId: splice.id })}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              {facilitySplices.length === 0 ? <p className="text-xs text-muted-foreground">No splice recorded yet.</p> : null}
            </div>

            <div className="mt-3 grid gap-2">
              <Select value={fromCableId} disabled={!canEdit} onChange={(event) => setFromCableId(event.target.value)}>
                <option value="">From cable</option>
                {facilityCables.map((cable) => (
                  <option key={cable.id} value={cable.id}>
                    {cable.name}
                  </option>
                ))}
              </Select>
              <Input value={fromCoreLabel} disabled={!canEdit} onChange={(event) => setFromCoreLabel(event.target.value)} placeholder="From core label (e.g. Blue-1)" />
              <Select value={toCableId} disabled={!canEdit} onChange={(event) => setToCableId(event.target.value)}>
                <option value="">To cable</option>
                {facilityCables.map((cable) => (
                  <option key={cable.id} value={cable.id}>
                    {cable.name}
                  </option>
                ))}
              </Select>
              <Input value={toCoreLabel} disabled={!canEdit} onChange={(event) => setToCoreLabel(event.target.value)} placeholder="To core label (e.g. Blue-1)" />
              <Textarea value={spliceNotes} disabled={!canEdit} onChange={(event) => setSpliceNotes(event.target.value)} placeholder="Splice notes (optional)" />
              <Button
                size="sm"
                disabled={!fromCableId || !toCableId || !fromCoreLabel || !toCoreLabel || !canEdit}
                onClick={() => {
                  if (!fromCableId || !toCableId || !fromCoreLabel || !toCoreLabel) return;
                  onUpsertSplice({
                    nodeId: node.id,
                    splice: {
                      id: randomId("splice"),
                      fromCableId,
                      fromCoreLabel,
                      toCableId,
                      toCoreLabel,
                      notes: spliceNotes.trim() || undefined,
                    },
                  });
                  setFromCableId("");
                  setToCableId("");
                  setFromCoreLabel("");
                  setToCoreLabel("");
                  setSpliceNotes("");
                }}
              >
                Add Splice
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-danger/40 bg-danger/5 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-danger">Danger Zone</p>
            <Button
              type="button"
              className="mt-2"
              variant="danger"
              disabled={!canDelete || !onDeleteNode}
              onClick={() => onDeleteNode?.({ nodeId: node.id })}
            >
              Delete {node.type.toUpperCase()}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Select a facility marker to inspect details.</p>
      )}
    </NodeDetailsDrawer>
  );
}
