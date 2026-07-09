"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { FibreCoreCount, FibreInstallationMethod, FibreRouteStatus, GeoPoint, NetworkNode, NodeType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { calculatePolylineDistanceMeters, formatCableDistance } from "@/lib/fibre-routing";

const coreCountValues = [2, 4, 8, 12, 24, 48, 96, 144, 288] as const;
const routeStatusValues = ["existing", "planned", "temporary", "maintenance"] as const;
const installationMethodValues = ["underground", "aerial", "duct", "indoor"] as const;
const routeTypeValues = ["backbone", "distribution", "drop", "feeder", "access"] as const;
const builderModeValues = ["asset", "coordinates", "draw"] as const;

const schema = z
  .object({
    name: z.string().optional(),
    cableType: z.string().optional(),
    owner: z.string().optional(),
    builderMode: z.enum(builderModeValues),
    startAssetId: z.string().optional(),
    endAssetId: z.string().optional(),
    coordinateChain: z.string().optional(),
    coreCount: z.coerce.number().refine((value) => coreCountValues.includes(value as (typeof coreCountValues)[number])),
    routeStatus: z.enum(routeStatusValues),
    routeType: z.enum(routeTypeValues),
    installationMethod: z.enum(installationMethodValues),
    installDate: z.string().optional(),
    depthMeters: z.coerce.number().optional(),
    heightMeters: z.coerce.number().optional(),
    notes: z.string().optional(),
  })
  .superRefine((values, context) => {
    if (values.builderMode === "asset") {
      if (!values.startAssetId) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["startAssetId"], message: "Select start asset" });
      }
      if (!values.endAssetId) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["endAssetId"], message: "Select end asset" });
      }
      if (values.startAssetId && values.endAssetId && values.startAssetId === values.endAssetId) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["endAssetId"], message: "Start and end assets must be different" });
      }
    }

    if (values.builderMode === "coordinates") {
      const lines = values.coordinateChain?.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) ?? [];
      if (lines.length < 2) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["coordinateChain"], message: "Enter at least two coordinates" });
      }
      lines.forEach((line, index) => {
        if (!/^[-+]?\d+(?:\.\d+)?\s*,\s*[-+]?\d+(?:\.\d+)?$/.test(line)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["coordinateChain"],
            message: `Coordinate ${index + 1} must be in "lat,lng" format`,
          });
        }
      });
    }
  });

type FormValues = z.infer<typeof schema>;

type AddFiberPayload = {
  name?: string;
  cableType?: string;
  owner?: string;
  start: GeoPoint;
  end: GeoPoint;
  geometry?: GeoPoint[];
  coreCount: FibreCoreCount;
  routeStatus: FibreRouteStatus;
  routeType: "backbone" | "distribution" | "drop" | "feeder" | "access";
  installationMethod: FibreInstallationMethod;
  installDate?: string;
  depthMeters?: number;
  heightMeters?: number;
  notes?: string;
  startNodeId?: string;
  endNodeId?: string;
  startAssetType?: NodeType;
  startAssetName?: string;
  endAssetType?: NodeType;
  endAssetName?: string;
  creationMode: "asset" | "coordinates" | "draw";
};

type AddFiberFormProps = {
  nodes: NetworkNode[];
  drawnPoints: GeoPoint[];
  isDrawingRoute: boolean;
  onStartDrawing: () => void;
  onStopDrawing: () => void;
  onClearDrawing: () => void;
  onSubmit: (payload: AddFiberPayload) => void;
};

function parseCoordinateChain(value: string | undefined) {
  const lines = value?.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) ?? [];
  return lines
    .map((line) => {
      const [latText, lngText] = line.split(",");
      const lat = Number(latText);
      const lng = Number(lngText);
      if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
      return { lat, lng };
    })
    .filter((point): point is GeoPoint => Boolean(point));
}

export function AddFiberForm({
  nodes,
  drawnPoints,
  isDrawingRoute,
  onStartDrawing,
  onStopDrawing,
  onClearDrawing,
  onSubmit,
}: AddFiberFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      cableType: "",
      owner: "VUX Fiber Ops",
      builderMode: "asset",
      startAssetId: "",
      endAssetId: "",
      coordinateChain: "6.455, 3.476\n6.457, 3.481",
      coreCount: 24,
      routeStatus: "planned",
      routeType: "distribution",
      installationMethod: "underground",
      installDate: new Date().toISOString().slice(0, 10),
      depthMeters: 0.9,
      heightMeters: 5.5,
      notes: "",
    },
  });

  const builderMode = form.watch("builderMode");
  const startAssetId = form.watch("startAssetId");
  const endAssetId = form.watch("endAssetId");
  const coordinateChainValue = form.watch("coordinateChain");
  const routeType = form.watch("routeType");

  const coordinatePoints = useMemo(() => parseCoordinateChain(coordinateChainValue), [coordinateChainValue]);
  const supportedNodes = useMemo(
    () =>
      nodes.filter((node) =>
        ["mst", "closure", "olt", "pop", "customer"].includes(node.type),
      ),
    [nodes],
  );
  const startAsset = supportedNodes.find((node) => node.id === startAssetId);
  const endAsset = supportedNodes.find((node) => node.id === endAssetId);

  const previewPoints = useMemo(() => {
    if (builderMode === "asset") {
      if (!startAsset || !endAsset) return [] as GeoPoint[];
      return [startAsset.location, endAsset.location];
    }
    if (builderMode === "coordinates") {
      return coordinatePoints;
    }
    return drawnPoints;
  }, [builderMode, coordinatePoints, drawnPoints, endAsset, startAsset]);

  const previewDistance = useMemo(
    () => (previewPoints.length >= 2 ? calculatePolylineDistanceMeters(previewPoints) : 0),
    [previewPoints],
  );

  const submit = form.handleSubmit((values) => {
    const sharedPayload = {
      name: values.name?.trim(),
      cableType: values.cableType?.trim() || `${values.coreCount}-core`,
      owner: values.owner?.trim() || undefined,
      coreCount: values.coreCount as FibreCoreCount,
      routeStatus: values.routeStatus,
      routeType: values.routeType,
      installationMethod: values.installationMethod,
      installDate: values.installDate || undefined,
      depthMeters: values.depthMeters,
      heightMeters: values.heightMeters,
      notes: values.notes?.trim() || undefined,
    };

    if (values.builderMode === "asset") {
      if (!startAsset || !endAsset) return;
      onSubmit({
        ...sharedPayload,
        start: startAsset.location,
        end: endAsset.location,
        geometry: [startAsset.location, endAsset.location],
        startNodeId: startAsset.id,
        endNodeId: endAsset.id,
        startAssetType: startAsset.type,
        startAssetName: startAsset.name,
        endAssetType: endAsset.type,
        endAssetName: endAsset.name,
        creationMode: "asset",
      });
      return;
    }

    if (values.builderMode === "coordinates") {
      if (coordinatePoints.length < 2) return;
      onSubmit({
        ...sharedPayload,
        start: coordinatePoints[0],
        end: coordinatePoints[coordinatePoints.length - 1],
        geometry: coordinatePoints,
        startNodeId: startAsset?.id,
        endNodeId: endAsset?.id,
        startAssetType: startAsset?.type,
        startAssetName: startAsset?.name,
        endAssetType: endAsset?.type,
        endAssetName: endAsset?.name,
        creationMode: "coordinates",
      });
      return;
    }

    if (drawnPoints.length < 2) return;
    onSubmit({
      ...sharedPayload,
      start: drawnPoints[0],
      end: drawnPoints[drawnPoints.length - 1],
      geometry: drawnPoints,
      startNodeId: startAsset?.id,
      endNodeId: endAsset?.id,
      startAssetType: startAsset?.type,
      startAssetName: startAsset?.name,
      endAssetType: endAsset?.type,
      endAssetName: endAsset?.name,
      creationMode: "draw",
    });
  });

  return (
    <form onSubmit={submit} className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Add Fibre Route</p>

      <div>
        <Label htmlFor="fiber-name" className="text-xs">
          Route Name
        </Label>
        <Input id="fiber-name" placeholder="Lekki POP to OLT West feeder" {...form.register("name")} />
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <div>
          <Label htmlFor="fiber-type" className="text-xs">
            Cable Type
          </Label>
          <Input id="fiber-type" placeholder="48-core feeder cable" {...form.register("cableType")} />
        </div>
        <div>
          <Label htmlFor="fiber-owner" className="text-xs">
            Owner
          </Label>
          <Input id="fiber-owner" placeholder="VUX Fiber Ops" {...form.register("owner")} />
        </div>
      </div>

      <div>
        <Label htmlFor="route-builder-mode" className="text-xs">
          Drawing Method
        </Label>
        <Select id="route-builder-mode" {...form.register("builderMode")}>
          <option value="asset">Asset To Asset</option>
          <option value="coordinates">Coordinate Chain</option>
          <option value="draw">Manual Drawing On Map</option>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <div>
          <Label htmlFor="fiber-start-asset" className="text-xs">
            Start Asset
          </Label>
          <Select id="fiber-start-asset" {...form.register("startAssetId")}>
            <option value="">Select start asset</option>
            {supportedNodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.name} ({node.type.toUpperCase()})
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="fiber-end-asset" className="text-xs">
            End Asset
          </Label>
          <Select id="fiber-end-asset" {...form.register("endAssetId")}>
            <option value="">Select end asset</option>
            {supportedNodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.name} ({node.type.toUpperCase()})
              </option>
            ))}
          </Select>
        </div>
      </div>

      {builderMode === "coordinates" ? (
        <div>
          <Label htmlFor="coordinate-chain" className="text-xs">
            Coordinates
          </Label>
          <Textarea
            id="coordinate-chain"
            rows={5}
            placeholder={"6.455, 3.476\n6.4562, 3.478\n6.4575, 3.481"}
            {...form.register("coordinateChain")}
          />
          <p className="mt-1 text-[11px] text-muted-foreground">Enter one `lat,lng` pair per line. Add as many bends as needed.</p>
        </div>
      ) : null}

      {builderMode === "draw" ? (
        <div className="rounded-xl border border-border/70 bg-background/60 p-3 text-xs">
          <p className="font-semibold uppercase tracking-[0.18em] text-muted-foreground">Manual Drawing</p>
          <p className="mt-1 text-muted-foreground">Click points on the map to draw the route. Each click adds a bend or extension point.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={isDrawingRoute ? onStopDrawing : onStartDrawing}>
              {isDrawingRoute ? "Pause Drawing" : "Start Drawing"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onClearDrawing}>
              Clear Points
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">{drawnPoints.length} point(s) captured.</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <div>
          <Label htmlFor="fiber-core-count" className="text-xs">
            Core Count
          </Label>
          <Select id="fiber-core-count" {...form.register("coreCount")}>
            {coreCountValues.map((count) => (
              <option key={count} value={count}>
                {count}-core
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="fiber-route-type" className="text-xs">
            Route Type
          </Label>
          <Select id="fiber-route-type" {...form.register("routeType")}>
            {routeTypeValues.map((value) => (
              <option key={value} value={value}>
                {value[0]?.toUpperCase()}
                {value.slice(1)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="fiber-route-status" className="text-xs">
            Status
          </Label>
          <Select id="fiber-route-status" {...form.register("routeStatus")}>
            {routeStatusValues.map((status) => (
              <option key={status} value={status}>
                {status[0]?.toUpperCase()}
                {status.slice(1)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <div>
          <Label htmlFor="fiber-installation-method" className="text-xs">
            Install Method
          </Label>
          <Select id="fiber-installation-method" {...form.register("installationMethod")}>
            {installationMethodValues.map((method) => (
              <option key={method} value={method}>
                {method[0]?.toUpperCase()}
                {method.slice(1)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="fiber-install-date" className="text-xs">
            Install Date
          </Label>
          <Input id="fiber-install-date" type="date" {...form.register("installDate")} />
        </div>
        <div>
          <Label htmlFor="fiber-depth" className="text-xs">
            Depth / Height
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <Input id="fiber-depth" type="number" step="0.1" placeholder="Depth m" {...form.register("depthMeters")} />
            <Input id="fiber-height" type="number" step="0.1" placeholder="Height m" {...form.register("heightMeters")} />
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="fiber-notes" className="text-xs">
          Notes
        </Label>
        <Textarea id="fiber-notes" rows={3} placeholder="Route notes, field constraints, crossings, or installation remarks" {...form.register("notes")} />
      </div>

      <div className="rounded-lg border border-border/70 bg-background/60 px-3 py-2 text-[11px] text-muted-foreground">
        <p>Route type: {routeType}</p>
        <p>Captured points: {previewPoints.length}</p>
        <p>Total distance: {previewPoints.length >= 2 ? formatCableDistance(previewDistance) : "Add at least two points"}</p>
        <p>
          Start: {startAsset ? `${startAsset.name} (${startAsset.type.toUpperCase()})` : previewPoints[0] ? `${previewPoints[0].lat.toFixed(5)}, ${previewPoints[0].lng.toFixed(5)}` : "-"}
        </p>
        <p>
          End: {endAsset ? `${endAsset.name} (${endAsset.type.toUpperCase()})` : previewPoints[previewPoints.length - 1] ? `${previewPoints[previewPoints.length - 1].lat.toFixed(5)}, ${previewPoints[previewPoints.length - 1].lng.toFixed(5)}` : "-"}
        </p>
      </div>

      <Button type="submit" size="sm" className="w-full">
        Create Fibre Route
      </Button>
    </form>
  );
}
