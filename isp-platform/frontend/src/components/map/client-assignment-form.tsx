import { useEffect, useMemo, useState } from "react";
import type { Customer, GeoPoint, SplitterPort } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  initialClientLocation?: GeoPoint;
  pickedLocation?: GeoPoint;
  isPickingLocation?: boolean;
  disabled?: boolean;
  onStartLocationPick?: () => void;
  onSubmit: (payload: {
    clientId: string;
    clientName: string;
    clientLocation: GeoPoint;
    portNumber: number;
    cableId: string;
    coreId: string;
    coreLabel: string;
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
  initialClientLocation,
  pickedLocation,
  isPickingLocation = false,
  disabled = false,
  onStartLocationPick,
  onSubmit,
  onCancel,
}: ClientAssignmentFormProps) {
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedPort, setSelectedPort] = useState("");
  const [selectedCoreKey, setSelectedCoreKey] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  useEffect(() => {
    const nextCustomer = initialClientId ? customers.find((customer) => customer.id === initialClientId) : undefined;
    const nextLocation = initialClientLocation ?? nextCustomer?.location;
    setSelectedClientId(initialClientId ?? "");
    setSelectedPort(initialPort ? String(initialPort) : "");
    setSelectedCoreKey("");
    setLatitude(nextLocation ? String(nextLocation.lat) : "");
    setLongitude(nextLocation ? String(nextLocation.lng) : "");
  }, [customers, initialClientId, initialClientLocation, initialPort]);

  useEffect(() => {
    if (!pickedLocation) return;
    setLatitude(String(pickedLocation.lat));
    setLongitude(String(pickedLocation.lng));
  }, [pickedLocation]);

  const selectedClient = useMemo(
    () => customers.find((customer) => customer.id === selectedClientId),
    [customers, selectedClientId],
  );
  const selectedCore = useMemo(
    () => coreOptions.find((option) => option.key === selectedCoreKey),
    [coreOptions, selectedCoreKey],
  );
  const parsedLocation = useMemo(() => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return undefined;
    return { lat, lng };
  }, [latitude, longitude]);

  const canSubmit = Boolean(selectedClient && selectedPort && selectedCore && parsedLocation && !disabled);

  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-background/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Client Assignment</p>
        {selectedClient?.mstId ? (
          <span className="text-[11px] text-muted-foreground">
            Current: {selectedClient.mstId} / Port {selectedClient.splitterPort ?? "-"}
          </span>
        ) : null}
      </div>

      <Select
        value={selectedClientId}
        disabled={disabled}
        onChange={(event) => {
          const nextClient = customers.find((customer) => customer.id === event.target.value);
          setSelectedClientId(event.target.value);
          if (nextClient?.location) {
            setLatitude(String(nextClient.location.lat));
            setLongitude(String(nextClient.location.lng));
          }
        }}
      >
        <option value="">Select existing CRM client</option>
        {customers.map((customer) => (
          <option key={customer.id} value={customer.id}>
            {customer.name} {customer.pppoeUsername ? `(${customer.pppoeUsername})` : ""}
          </option>
        ))}
      </Select>

      <div className="grid grid-cols-2 gap-2">
        <Select value={selectedPort} disabled={disabled} onChange={(event) => setSelectedPort(event.target.value)}>
          <option value="">Select splitter port</option>
          {ports.map((port) => (
            <option key={port.port} value={port.port}>
              Port {port.port} {port.customerName ? `(${port.customerName})` : ""}
            </option>
          ))}
        </Select>
        <Select value={selectedCoreKey} disabled={disabled} onChange={(event) => setSelectedCoreKey(event.target.value)}>
          <option value="">Select fibre core</option>
          {coreOptions.map((option) => (
            <option key={option.key} value={option.key}>
              {option.coreLabel} ({option.cableName})
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2 rounded-xl border border-border/60 bg-background/80 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Client Coordinates</p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled || !selectedClient?.location}
              onClick={() => {
                if (!selectedClient?.location) return;
                setLatitude(String(selectedClient.location.lat));
                setLongitude(String(selectedClient.location.lng));
              }}
            >
              Use CRM Location
            </Button>
            <Button type="button" size="sm" disabled={disabled} onClick={() => onStartLocationPick?.()}>
              {isPickingLocation ? "Click Map..." : "Pick On Map"}
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            step="any"
            placeholder="Latitude"
            value={latitude}
            disabled={disabled}
            onChange={(event) => setLatitude(event.target.value)}
          />
          <Input
            type="number"
            step="any"
            placeholder="Longitude"
            value={longitude}
            disabled={disabled}
            onChange={(event) => setLongitude(event.target.value)}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          A road-following drop route will be generated from the MST to this client coordinate.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          disabled={!canSubmit}
          onClick={() => {
            if (!selectedClient || !selectedPort || !selectedCore || !parsedLocation) return;
            onSubmit({
              clientId: selectedClient.id,
              clientName: selectedClient.name,
              clientLocation: parsedLocation,
              portNumber: Number(selectedPort),
              cableId: selectedCore.cableId,
              coreId: selectedCore.coreId,
              coreLabel: selectedCore.coreLabel,
              fiberCore: selectedCore.color,
            });
          }}
        >
          Save Assignment
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  );
}
