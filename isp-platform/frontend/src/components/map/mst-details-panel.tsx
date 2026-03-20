"use client";

import { useEffect, useMemo, useState } from "react";
import type { Customer, FibreCable, NetworkNode } from "@/types";
import { SplitterGrid } from "@/components/map/splitter-grid";
import { Drawer } from "@/components/ui/drawer";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
    cableId?: string;
    coreId?: string;
  }) => void;
};

export function MSTDetailsPanel({ open, node, cables, customers, onOpenChange, onAssignClient }: MSTDetailsPanelProps) {
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedPort, setSelectedPort] = useState("");
  const [selectedCoreKey, setSelectedCoreKey] = useState("");

  useEffect(() => {
    if (!open) {
      setSelectedClientId("");
      setSelectedPort("");
      setSelectedCoreKey("");
    }
  }, [open]);

  const connectedCables = useMemo(() => {
    if (!node) return [];
    return cables.filter((cable) => cable.fromNodeId === node.id || cable.toNodeId === node.id);
  }, [cables, node]);

  const freeCoreOptions = useMemo(() => {
    return connectedCables.flatMap((cable) =>
      cable.cores
        .filter((core) => core.status === "free")
        .map((core) => ({
          key: `${cable.id}:${core.id}`,
          cableId: cable.id,
          cableName: cable.name,
          coreId: core.id,
          coreLabel: core.label,
          color: core.label.split("-")[0].toLowerCase(),
        })),
    );
  }, [connectedCables]);

  const selectedClient = customers.find((customer) => customer.id === selectedClientId);
  const selectedCore = freeCoreOptions.find((option) => option.key === selectedCoreKey);

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title={node ? node.name : "MST Details"} description="Field engineering and splitter operations">
      {node ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-background/60 p-3 text-sm">
            <p>
              <span className="text-muted-foreground">MST ID:</span> {node.id}
            </p>
            <p>
              <span className="text-muted-foreground">Coordinates:</span> {node.location.lat.toFixed(5)}, {node.location.lng.toFixed(5)}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {connectedCables.map((cable) => (
                <Badge key={cable.id} variant="outline">
                  {cable.name}
                </Badge>
              ))}
            </div>
          </div>

          {node.splitterPorts ? <SplitterGrid ports={node.splitterPorts} clients={node.clients} /> : null}

          <div className="space-y-2 rounded-xl border border-border/70 bg-background/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              CRM Assignment (Client must exist first)
            </p>
            <Select value={selectedClientId} onChange={(event) => setSelectedClientId(event.target.value)}>
              <option value="">Select existing client</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Select value={selectedPort} onChange={(event) => setSelectedPort(event.target.value)}>
                <option value="">Splitter port</option>
                {(node.splitterPorts ?? []).map((port) => (
                  <option key={port.port} value={port.port}>
                    Port {port.port} {port.customerName ? `(${port.customerName})` : `(${port.status})`}
                  </option>
                ))}
              </Select>
              <Select value={selectedCoreKey} onChange={(event) => setSelectedCoreKey(event.target.value)}>
                <option value="">Fibre core</option>
                {freeCoreOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.coreLabel} ({option.cableName})
                  </option>
                ))}
              </Select>
            </div>
            <Button
              disabled={!selectedClient || !selectedPort || !selectedCore}
              onClick={() => {
                if (!selectedClient || !selectedPort || !selectedCore) return;
                onAssignClient({
                  mstId: node.id,
                  portNumber: Number(selectedPort),
                  clientId: selectedClient.id,
                  clientName: selectedClient.name,
                  fiberCore: selectedCore.color,
                  cableId: selectedCore.cableId,
                  coreId: selectedCore.coreId,
                });
                setSelectedClientId("");
                setSelectedPort("");
                setSelectedCoreKey("");
              }}
            >
              Assign Client to Port
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Select an MST marker from the map.</p>
      )}
    </Drawer>
  );
}
