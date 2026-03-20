
import { useMemo, useState } from "react";
import type { Customer, FibreCable, NetworkNode, SplitterType } from "@/types";
import { ClientAssignmentForm, type AssignmentCoreOption } from "@/components/map/client-assignment-form";
import { CoreListView } from "@/components/map/core-list-view";
import { NodeDetailsDrawer } from "@/components/map/node-details-drawer";
import { SplitterEditor } from "@/components/map/splitter-editor";
import { Button } from "@/components/ui/button";

type MSTDetailsPanelProps = {
  open: boolean;
  node?: NetworkNode;
  cables: FibreCable[];
  customers: Customer[];
  onOpenChange: (open: boolean) => void;
  onAssignClient: (payload: {
    mstId: string;
    portNumber: number;
    clientId: string;
    clientName: string;
    fiberCore: string;
    cableId: string;
    coreId: string;
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
  onOpenChange,
  onAssignClient,
  onRemoveClient,
  onChangeSplitterType,
  onDeleteMst,
}: MSTDetailsPanelProps) {
  const [activeTab, setActiveTab] = useState("splitter");
  const [editingPort, setEditingPort] = useState<number | undefined>();

  const connectedCables = useMemo(() => {
    if (!node) return [];
    return cables.filter((cable) => cable.fromNodeId === node.id || cable.toNodeId === node.id);
  }, [cables, node]);

  const splitterType = (node?.splitterType ?? "1/8") as SplitterType;
  const ports = node?.splitterPorts ?? [];
  const clients = node?.clients ?? [];

  const freeCoreOptions = useMemo(() => {
    return connectedCables.flatMap((cable) =>
      cable.cores
        .filter((core) => core.status === "free")
        .map((core) => ({
          key: cable.id + ":" + core.id,
          cableId: cable.id,
          cableName: cable.name,
          coreId: core.id,
          coreLabel: core.label,
          color: core.label.split("-")[0].toLowerCase(),
        })),
    ) as AssignmentCoreOption[];
  }, [connectedCables]);

  const editingPortDetails = ports.find((port) => port.port === editingPort);

  return (
    <NodeDetailsDrawer
      open={open}
      onOpenChange={onOpenChange}
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
      description="Field engineering and splitter controls"
    >
      {node ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button size="sm" variant={activeTab === "splitter" ? "default" : "outline"} onClick={() => setActiveTab("splitter")}>Splitter</Button>
            <Button size="sm" variant={activeTab === "cores" ? "default" : "outline"} onClick={() => setActiveTab("cores")}>Incoming Cores</Button>
          </div>

          {activeTab === "splitter" ? (
            <>
              <SplitterEditor
                splitterType={splitterType}
                ports={ports}
                clients={clients}
                onChangeSplitterType={(nextType) => onChangeSplitterType?.({ mstId: node.id, splitterType: nextType })}
                onAssignOrEdit={(portNumber) => setEditingPort(portNumber)}
                onRemoveClient={(portNumber) => onRemoveClient?.({ mstId: node.id, portNumber })}
              />

              {editingPort ? (
                <ClientAssignmentForm
                  customers={customers}
                  ports={ports}
                  coreOptions={freeCoreOptions}
                  initialPort={editingPort}
                  initialClientId={editingPortDetails?.customerId}
                  onCancel={() => setEditingPort(undefined)}
                  onSubmit={(payload) => {
                    onAssignClient({
                      mstId: node.id,
                      portNumber: payload.portNumber,
                      clientId: payload.clientId,
                      clientName: payload.clientName,
                      fiberCore: payload.fiberCore,
                      cableId: payload.cableId,
                      coreId: payload.coreId,
                    });
                    setEditingPort(undefined);
                  }}
                />
              ) : null}

              <div className="rounded-xl border border-danger/40 bg-danger/5 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-danger">Danger Zone</p>
                <Button
                  className="mt-2"
                  variant="danger"
                  disabled={!onDeleteMst}
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
                  <p className="text-xs font-semibold">{cable.name}</p>
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




