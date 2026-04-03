import { useEffect, useMemo, useState } from "react";
import type { Customer, FibreCable, GeoPoint, NetworkNode, SplitterType } from "@/types";
import { ClientAssignmentForm, type AssignmentCoreOption } from "@/components/map/client-assignment-form";
import { CoreListView } from "@/components/map/core-list-view";
import { NodeDetailsDrawer } from "@/components/map/node-details-drawer";
import { SplitterEditor } from "@/components/map/splitter-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type MSTDetailsPanelProps = {
  open: boolean;
  node?: NetworkNode;
  cables: FibreCable[];
  customers: Customer[];
  pickedClientLocation?: GeoPoint;
  isPickingClientLocation?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  historyEntries?: Array<{ id: string; message: string; timestamp: string }>;
  nodeLookup?: Record<string, string>;
  onAddNote?: (payload: { nodeId: string; note: string }) => void;
  canAddNote?: boolean;
  onOpenChange: (open: boolean) => void;
  onStartClientLocationPick?: () => void;
  onAssignClient: (payload: {
    mstId: string;
    portNumber: number;
    clientId: string;
    clientName: string;
    clientLocation: GeoPoint;
    fiberCore: string;
    cableId: string;
    coreId: string;
    coreLabel: string;
  }) => void;
  onRemoveClient?: (payload: { mstId: string; portNumber: number }) => void;
  onChangeSplitterType?: (payload: { mstId: string; splitterType: SplitterType }) => void;
  onDeleteMst?: (payload: { mstId: string }) => void;
};

export function MSTDetailsPanel({
  open,
  node,
  cables,
  customers,
  pickedClientLocation,
  isPickingClientLocation = false,
  canEdit = true,
  canDelete = false,
  historyEntries,
  nodeLookup,
  onAddNote,
  canAddNote = true,
  onOpenChange,
  onStartClientLocationPick,
  onAssignClient,
  onRemoveClient,
  onChangeSplitterType,
  onDeleteMst,
}: MSTDetailsPanelProps) {
  const [activeTab, setActiveTab] = useState<"splitter" | "cores">("splitter");
  const [editingPort, setEditingPort] = useState<number | undefined>();
  const [isEditingPorts, setIsEditingPorts] = useState(false);

  const connectedCables = useMemo(() => {
    if (!node) return [];
    return cables.filter((cable) => cable.fromNodeId === node.id || cable.toNodeId === node.id);
  }, [cables, node]);

  const splitterType = (node?.splitterType ?? "1/8") as SplitterType;
  const ports = node?.splitterPorts ?? [];
  const clients = node?.clients ?? [];
  const editingPortDetails = ports.find((port) => port.port === editingPort);
  const editingCustomer = customers.find((customer) => customer.id === editingPortDetails?.customerId);
  const usedPortCount = ports.filter((port) => port.status === "used").length;
  const freePortCount = ports.filter((port) => port.status === "free").length;
  const totalPortCount = ports.length;
  const firstAvailablePort = ports.find((port) => port.status === "free")?.port ?? ports[0]?.port;

  useEffect(() => {
    if (!open) {
      setEditingPort(undefined);
      setIsEditingPorts(false);
    }
  }, [open]);

  useEffect(() => {
    setEditingPort(undefined);
    setIsEditingPorts(false);
  }, [node?.id]);

  const availableCoreOptions = useMemo(() => {
    return connectedCables.flatMap((cable) =>
      cable.cores
        .filter((core) => core.status === "free" || core.assignedToCustomerId === editingPortDetails?.customerId)
        .map((core) => ({
          key: `${cable.id}:${core.id}`,
          cableId: cable.id,
          cableName: cable.name,
          coreId: core.id,
          coreLabel: core.label,
          color: core.label.split("-")[0].toLowerCase(),
        })),
    ) as AssignmentCoreOption[];
  }, [connectedCables, editingPortDetails?.customerId]);

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
      title={node ? node.name : "MST Details"}
      description="Simple MST workflow: splitter, ports, and client drops"
    >
      {node ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button size="sm" variant={activeTab === "splitter" ? "default" : "outline"} onClick={() => setActiveTab("splitter")}>
                Splitter & Clients
              </Button>
              <Button size="sm" variant={activeTab === "cores" ? "default" : "outline"} onClick={() => setActiveTab("cores")}>
                Incoming Cores
              </Button>
            </div>
            <Badge variant="outline">{clients.length} clients</Badge>
          </div>

          {activeTab === "splitter" ? (
            <>
              {!isEditingPorts ? (
                <>
                  <div className="rounded-xl border border-border/70 bg-background/60 p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Port Utilization Summary</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{usedPortCount} used</span>
                          <span>|</span>
                          <span>{freePortCount} free</span>
                          <span>|</span>
                          <span>{totalPortCount} total</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          disabled={!canEdit || !firstAvailablePort}
                          onClick={() => {
                            setIsEditingPorts(true);
                            setEditingPort(firstAvailablePort);
                          }}
                        >
                          Assign Client
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!canEdit}
                          onClick={() => {
                            setIsEditingPorts(true);
                            setEditingPort(undefined);
                          }}
                        >
                          Manage Ports
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/70 bg-background/60 p-3 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Assigned Clients</p>
                    <div className="mt-2 space-y-1">
                      {clients.map((client) => (
                        <div key={`${client.id}-${client.splitterPort}`} className="rounded-lg border border-border/60 bg-background/80 px-3 py-2">
                          <p className="text-sm font-medium">
                            Port {client.splitterPort} {"->"} {client.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">Core used: {client.fiberCore}</p>
                        </div>
                      ))}
                      {clients.length === 0 ? <p className="text-xs text-muted-foreground">No client is assigned to this MST yet.</p> : null}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-xl border border-border/70 bg-background/60 p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Port Utilization Summary</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{usedPortCount} used</span>
                          <span>|</span>
                          <span>{freePortCount} free</span>
                          <span>|</span>
                          <span>{totalPortCount} total</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsEditingPorts(false);
                          setEditingPort(undefined);
                        }}
                      >
                        Back to Summary
                      </Button>
                    </div>
                  </div>

                  <SplitterEditor
                    splitterType={splitterType}
                    ports={ports}
                    clients={clients}
                    disabled={!canEdit}
                    canRemove={canDelete}
                    onChangeSplitterType={(nextType) => onChangeSplitterType?.({ mstId: node.id, splitterType: nextType })}
                    onAssignOrEdit={(portNumber) => setEditingPort(portNumber)}
                    onRemoveClient={(portNumber) => onRemoveClient?.({ mstId: node.id, portNumber })}
                  />

                  {editingPort ? (
                    <ClientAssignmentForm
                      customers={customers}
                      ports={ports}
                      coreOptions={availableCoreOptions}
                      initialPort={editingPort}
                      initialClientId={editingPortDetails?.customerId}
                      initialClientLocation={editingCustomer?.location}
                      pickedLocation={pickedClientLocation}
                      isPickingLocation={isPickingClientLocation}
                      disabled={!canEdit}
                      onStartLocationPick={onStartClientLocationPick}
                      onCancel={() => setEditingPort(undefined)}
                      onSubmit={(payload) => {
                        onAssignClient({
                          mstId: node.id,
                          portNumber: payload.portNumber,
                          clientId: payload.clientId,
                          clientName: payload.clientName,
                          clientLocation: payload.clientLocation,
                          fiberCore: payload.fiberCore,
                          cableId: payload.cableId,
                          coreId: payload.coreId,
                          coreLabel: payload.coreLabel,
                        });
                        setEditingPort(undefined);
                        setIsEditingPorts(false);
                      }}
                    />
                  ) : (
                    <div className="rounded-xl border border-border/70 bg-background/60 p-3 text-sm">
                      <p className="text-xs text-muted-foreground">Select a port to assign or edit client details.</p>
                    </div>
                  )}
                </>
              )}

              <div className="rounded-xl border border-danger/40 bg-danger/5 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-danger">Danger Zone</p>
                <Button
                  type="button"
                  className="mt-2"
                  variant="danger"
                  disabled={!canDelete || !onDeleteMst}
                  onClick={() => onDeleteMst?.({ mstId: node.id })}
                >
                  Delete MST
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Incoming Fibre Cores</p>
              {connectedCables.map((cable) => (
                <div key={cable.id} className="space-y-2 rounded-xl border border-border/70 bg-background/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold">{cable.name}</p>
                    <Badge variant="outline">{cable.segmentType ?? "distribution"}</Badge>
                  </div>
                  <CoreListView cores={cable.cores} />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Select an MST marker from the map.</p>
      )}
    </NodeDetailsDrawer>
  );
}
