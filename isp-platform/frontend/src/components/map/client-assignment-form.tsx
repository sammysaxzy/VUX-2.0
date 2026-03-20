import { useEffect, useMemo, useState } from "react";
import type { Customer, SplitterPort } from "@/types";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export type AssignmentCoreOption = {
  key: string;
  cableId: string;
  cableName: string;
  coreId: string;
  coreLabel: string;
  color: string;
};

type ClientAssignmentFormProps = {
  customers: Customer[];
  ports: SplitterPort[];
  coreOptions: AssignmentCoreOption[];
  initialPort?: number;
  initialClientId?: string;
  onSubmit: (payload: {
    clientId: string;
    clientName: string;
    portNumber: number;
    cableId: string;
    coreId: string;
    fiberCore: string;
  }) => void;
  onCancel?: () => void;
};

export function ClientAssignmentForm({
  customers,
  ports,
  coreOptions,
  initialPort,
  initialClientId,
  onSubmit,
  onCancel,
}: ClientAssignmentFormProps) {
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedPort, setSelectedPort] = useState("");
  const [selectedCoreKey, setSelectedCoreKey] = useState("");

  useEffect(() => {
    setSelectedClientId(initialClientId ?? "");
    setSelectedPort(initialPort ? String(initialPort) : "");
    setSelectedCoreKey("");
  }, [initialClientId, initialPort]);

  const selectedClient = useMemo(
    () => customers.find((customer) => customer.id === selectedClientId),
    [customers, selectedClientId],
  );
  const selectedCore = useMemo(
    () => coreOptions.find((option) => option.key === selectedCoreKey),
    [coreOptions, selectedCoreKey],
  );

  return (
    <div className="space-y-2 rounded-xl border border-border/70 bg-background/60 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Client Assignment</p>
      <Select value={selectedClientId} onChange={(event) => setSelectedClientId(event.target.value)}>
        <option value="">Select existing CRM client</option>
        {customers.map((customer) => (
          <option key={customer.id} value={customer.id}>
            {customer.name}
          </option>
        ))}
      </Select>
      <div className="grid grid-cols-2 gap-2">
        <Select value={selectedPort} onChange={(event) => setSelectedPort(event.target.value)}>
          <option value="">Select port</option>
          {ports.map((port) => (
            <option key={port.port} value={port.port}>
              Port {port.port} {port.customerName ? `(${port.customerName})` : ""}
            </option>
          ))}
        </Select>
        <Select value={selectedCoreKey} onChange={(event) => setSelectedCoreKey(event.target.value)}>
          <option value="">Select free core</option>
          {coreOptions.map((option) => (
            <option key={option.key} value={option.key}>
              {option.coreLabel} ({option.cableName})
            </option>
          ))}
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Button
          disabled={!selectedClient || !selectedPort || !selectedCore}
          onClick={() => {
            if (!selectedClient || !selectedPort || !selectedCore) return;
            onSubmit({
              clientId: selectedClient.id,
              clientName: selectedClient.name,
              portNumber: Number(selectedPort),
              cableId: selectedCore.cableId,
              coreId: selectedCore.coreId,
              fiberCore: selectedCore.color,
            });
          }}
        >
          Save Assignment
        </Button>
        {onCancel ? (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  );
}
