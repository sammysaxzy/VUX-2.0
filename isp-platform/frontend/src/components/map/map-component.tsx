"use client";

import { useMemo, useState } from "react";
import length from "@turf/length";
import { lineString } from "@turf/helpers";
import Map, { Layer, Marker, Popup, Source, type MapMouseEvent, type ViewState } from "react-map-gl/mapbox";
import { Link2, MapPinPlusInside, Router, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import type { ClosureBox, Customer, FibreCable, GeoPoint, MstConnectionDraft, NetworkNode } from "@/types";
import { useAppStore } from "@/store/app-store";
import { useThemeStore } from "@/store/theme-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ClosureSpliceForm } from "@/components/map/closure-splice-form";
import { FiberDetailsPanel } from "@/components/map/fiber-details-panel";
import { MSTDetailsPanel } from "@/components/map/mst-details-panel";
import { cn, randomId } from "@/lib/utils";

const mapToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

type Props = {
  nodes: NetworkNode[];
  cables: FibreCable[];
  closures?: ClosureBox[];
  customers?: Customer[];
  className?: string;
  onInfrastructureAdded?: (node: NetworkNode) => void;
  onRouteDrafted?: (route: { start: GeoPoint; end: GeoPoint; distanceMeters: number }) => void;
  onCreateMstConnection?: (payload: MstConnectionDraft) => void;
  onAssignCore?: (payload: { cableId: string; coreId: string }) => void;
  onAssignClient?: (payload: {
    mstId: string;
    portNumber: number;
    clientId: string;
    clientName: string;
    fiberCore: string;
    cableId?: string;
    coreId?: string;
  }) => void;
  onSaveSplice?: (payload: {
    closureId: string;
    splice: {
      id?: string;
      fromCableId: string;
      fromCoreColor: string;
      toCableId: string;
      toCoreColor: string;
      notes?: string;
    };
  }) => void;
  onDeleteSplice?: (payload: { closureId: string; spliceId: string }) => void;
  highlightedCableId?: string;
};

type AddMode = "none" | "olt" | "mst" | "pole" | "closure";
type CoreCount = 2 | 4 | 8 | 12 | 24;

const defaultView: Partial<ViewState> = {
  latitude: 6.455,
  longitude: 3.476,
  zoom: 11.8,
};

function resolveTheme(mode: "light" | "dark" | "system"): "light" | "dark" {
  if (mode !== "system") return mode;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const fibreCountOptions: CoreCount[] = [2, 4, 8, 12, 24];

function parseCoordinatePair(lat: string, lng: string): GeoPoint | null {
  if (!lat || !lng) return null;
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);
  if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) return null;
  return { lat: parsedLat, lng: parsedLng };
}

export function MapComponent({
  nodes,
  cables,
  closures = [],
  customers = [],
  className,
  highlightedCableId,
  onInfrastructureAdded,
  onRouteDrafted,
  onCreateMstConnection,
  onAssignCore,
  onAssignClient,
  onSaveSplice,
  onDeleteSplice,
}: Props) {
  const theme = useThemeStore((state) => state.theme);
  const [addMode, setAddMode] = useState<AddMode>("none");
  const [connectMode, setConnectMode] = useState(false);
  const [connectStartId, setConnectStartId] = useState<string>("");
  const [connectEndId, setConnectEndId] = useState<string>("");
  const [coreCount, setCoreCount] = useState<CoreCount>(12);
  const [manualStartLat, setManualStartLat] = useState("");
  const [manualStartLng, setManualStartLng] = useState("");
  const [manualEndLat, setManualEndLat] = useState("");
  const [manualEndLng, setManualEndLng] = useState("");
  const [hoveredCable, setHoveredCable] = useState<{ cable: FibreCable; point: GeoPoint } | null>(null);

  const selectedMSTId = useAppStore((state) => state.selectedMSTId);
  const selectedFiberId = useAppStore((state) => state.selectedFiberId);
  const selectedClosureId = useAppStore((state) => state.selectedClosureId);
  const modalType = useAppStore((state) => state.modalType);
  const setSelectedMST = useAppStore((state) => state.setSelectedMST);
  const setSelectedFiber = useAppStore((state) => state.setSelectedFiber);
  const setSelectedClosure = useAppStore((state) => state.setSelectedClosure);
  const setModalType = useAppStore((state) => state.setModalType);

  const mstNodes = useMemo(() => nodes.filter((node) => node.type === "mst"), [nodes]);
  const closureNodes = useMemo(() => nodes.filter((node) => node.type === "closure"), [nodes]);
  const selectedMst = mstNodes.find((node) => node.id === selectedMSTId);
  const selectedCable = cables.find((cable) => cable.id === selectedFiberId);
  const selectedClosure = useMemo(() => {
    if (!selectedClosureId) return undefined;
    const found = closures.find((entry) => entry.id === selectedClosureId);
    if (found) return found;

    const fallbackNode = closureNodes.find((node) => node.id === selectedClosureId);
    if (!fallbackNode) return undefined;
    return {
      id: fallbackNode.id,
      name: fallbackNode.name,
      location: fallbackNode.location,
      connectedCableIds: [],
      splices: [],
    };
  }, [closureNodes, closures, selectedClosureId]);

  const startNode = mstNodes.find((node) => node.id === connectStartId);
  const endNode = mstNodes.find((node) => node.id === connectEndId);
  const manualStart = parseCoordinatePair(manualStartLat, manualStartLng);
  const manualEnd = parseCoordinatePair(manualEndLat, manualEndLng);

  const resolvedStartPoint = manualStart ?? startNode?.location ?? null;
  const resolvedEndPoint = manualEnd ?? endNode?.location ?? null;
  const resolvedTheme = resolveTheme(theme);
  const mapStyle = resolvedTheme === "dark" ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11";

  const previewDistanceMeters = useMemo(() => {
    if (!resolvedStartPoint || !resolvedEndPoint) return 0;
    return Math.round(
      length(
        lineString([
          [resolvedStartPoint.lng, resolvedStartPoint.lat],
          [resolvedEndPoint.lng, resolvedEndPoint.lat],
        ]),
        { units: "kilometers" },
      ) * 1000,
    );
  }, [resolvedEndPoint, resolvedStartPoint]);

  const cableSource = useMemo(
    () => ({
      type: "FeatureCollection",
      features: cables.map((cable) => {
        const usedCores = cable.cores.filter((core) => core.status === "used").length;
        const freeCores = Math.max(cable.coreCount - usedCores, 0);
        return {
          type: "Feature",
          id: cable.id,
          properties: {
            id: cable.id,
            faulted: cable.faulted,
            highlighted: cable.id === highlightedCableId,
            coreCount: cable.coreCount,
            usedCores,
            freeCores,
          },
          geometry: {
            type: "LineString",
            coordinates: cable.coordinates.map((coord) => [coord.lng, coord.lat]),
          },
        };
      }),
    }),
    [cables, highlightedCableId],
  );

  const connectionPreview = useMemo(() => {
    if (!resolvedStartPoint || !resolvedEndPoint) return null;
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { id: "connection-preview" },
          geometry: {
            type: "LineString",
            coordinates: [
              [resolvedStartPoint.lng, resolvedStartPoint.lat],
              [resolvedEndPoint.lng, resolvedEndPoint.lat],
            ],
          },
        },
      ],
    };
  }, [resolvedEndPoint, resolvedStartPoint]);

  const addInfrastructure = (type: Exclude<AddMode, "none">, point: GeoPoint) => {
    const node: NetworkNode = {
      id: randomId(type),
      tenantId: "tenant-temp",
      type,
      name: `${type.toUpperCase()}-${Math.floor(Math.random() * 999)}`,
      location: point,
      status: "healthy",
      splitterType: type === "mst" ? "1/8" : undefined,
      splitterPorts:
        type === "mst"
          ? Array.from({ length: 8 }, (_, index) => ({
              port: index + 1,
              status: "free",
            }))
          : undefined,
      clients: type === "mst" ? [] : undefined,
    };
    onInfrastructureAdded?.(node);
  };

  const handleMapClick = (event: MapMouseEvent) => {
    const lineFeature = event.features?.find((feature) => feature.layer.id === "fibre-lines");
    if (lineFeature?.id) {
      const cableId = String(lineFeature.id);
      setSelectedFiber(cableId);
      setSelectedMST(undefined);
      setSelectedClosure(undefined);
      setModalType("fiber-details");
      return;
    }

    const point = { lat: event.lngLat.lat, lng: event.lngLat.lng };
    if (addMode !== "none") {
      addInfrastructure(addMode as Exclude<AddMode, "none">, point);
      setAddMode("none");
    }
  };

  const handleCreateConnection = () => {
    if (!connectStartId || !connectEndId) {
      toast.error("Select start and end MST before creating a fibre connection.");
      return;
    }
    if (!resolvedStartPoint || !resolvedEndPoint) {
      toast.error("Provide valid coordinates for both start and end points.");
      return;
    }
    if (connectStartId === connectEndId) {
      toast.error("Start and end MST cannot be the same.");
      return;
    }

    const draft: MstConnectionDraft = {
      startMstId: connectStartId,
      endMstId: connectEndId,
      start: resolvedStartPoint,
      end: resolvedEndPoint,
      coreCount,
    };

    onCreateMstConnection?.(draft);
    onRouteDrafted?.({ start: draft.start, end: draft.end, distanceMeters: previewDistanceMeters });
    toast.success(`${coreCount}-core link created between ${connectStartId} and ${connectEndId}.`);
    setConnectMode(false);
    setManualStartLat("");
    setManualStartLng("");
    setManualEndLat("");
    setManualEndLng("");
  };

  if (!mapToken) {
    return (
      <Card className={cn("grid min-h-[580px] place-content-center p-6 text-center", className)}>
        <p className="font-medium">Mapbox token is missing.</p>
        <p className="mt-1 text-sm text-muted-foreground">Set `VITE_MAPBOX_TOKEN` in your `.env` file.</p>
      </Card>
    );
  }

  return (
    <div className={cn("relative h-[calc(100vh-11rem)] overflow-hidden rounded-2xl border border-border/60", className)}>
      <Map
        initialViewState={defaultView}
        mapboxAccessToken={mapToken}
        mapStyle={mapStyle}
        interactiveLayerIds={["fibre-lines", "fibre-labels", "fault-glow"]}
        onClick={handleMapClick}
        onMouseMove={(event) => {
          const feature = event.features?.find((entry) => entry.layer.id === "fibre-lines");
          if (feature?.id) {
            const found = cables.find((cable) => cable.id === String(feature.id));
            if (found) {
              setHoveredCable({
                cable: found,
                point: { lat: event.lngLat.lat, lng: event.lngLat.lng },
              });
            }
            return;
          }
          setHoveredCable(null);
        }}
      >
        <Source id="fibre-source" type="geojson" data={cableSource as GeoJSON.FeatureCollection}>
          <Layer
            id="fibre-lines"
            type="line"
            paint={{
              "line-width": [
                "case",
                ["boolean", ["get", "highlighted"], false],
                8,
                ["boolean", ["get", "faulted"], false],
                6,
                4,
              ],
              "line-color": [
                "case",
                ["boolean", ["get", "highlighted"], false],
                "#F97316",
                ["boolean", ["get", "faulted"], false],
                "#EF4444",
                "#2DD4BF",
              ],
              "line-opacity": 0.9,
            }}
          />
          <Layer
            id="fibre-labels"
            type="symbol"
            layout={{
              "symbol-placement": "line-center",
              "text-field": ["concat", ["to-string", ["get", "coreCount"]], "-core"],
              "text-size": 11,
            }}
            paint={{
              "text-color": resolvedTheme === "dark" ? "#E2E8F0" : "#111827",
              "text-halo-color": resolvedTheme === "dark" ? "#0F172A" : "#FFFFFF",
              "text-halo-width": 1,
            }}
          />
          <Layer
            id="fault-glow"
            type="line"
            filter={["==", ["get", "faulted"], true]}
            paint={{
              "line-color": "#EF4444",
              "line-width": 14,
              "line-opacity": 0.15,
              "line-blur": 1.1,
            }}
          />
        </Source>

        {connectionPreview ? (
          <Source id="connection-preview" type="geojson" data={connectionPreview as GeoJSON.FeatureCollection}>
            <Layer
              id="connection-preview-line"
              type="line"
              paint={{
                "line-color": "#F59E0B",
                "line-width": 4,
                "line-dasharray": [2, 1],
              }}
            />
          </Source>
        ) : null}

        {nodes.map((node) => {
          const usedPorts = node.splitterPorts?.filter((port) => port.status === "used").length ?? 0;
          const totalPorts = node.splitterPorts?.length ?? 0;
          const utilization = totalPorts > 0 ? usedPorts / totalPorts : 0;
          const mstColorClass =
            utilization >= 1 ? "border-red-100 bg-red-600" : utilization >= 0.7 ? "border-yellow-100 bg-yellow-600" : "border-lime-100 bg-lime-600";

          return (
            <Marker key={node.id} longitude={node.location.lng} latitude={node.location.lat} anchor="bottom">
              <button
                type="button"
                className={cn(
                  "grid h-7 w-7 place-content-center rounded-full border-2 text-white shadow-lg transition hover:scale-110",
                  node.type === "olt" && "border-cyan-100 bg-cyan-600",
                  node.type === "mst" && mstColorClass,
                  node.type === "pole" && "border-amber-100 bg-amber-600",
                  node.type === "closure" && "border-fuchsia-100 bg-fuchsia-600",
                  node.type === "customer" && "border-blue-100 bg-blue-600",
                  node.status === "fault" && "animate-pulse border-red-100 bg-red-600",
                )}
                onClick={(event) => {
                  event.stopPropagation();
                  if (node.type === "mst" && connectMode) {
                    if (!connectStartId) {
                      setConnectStartId(node.id);
                    } else if (!connectEndId && connectStartId !== node.id) {
                      setConnectEndId(node.id);
                    } else {
                      setConnectStartId(node.id);
                      setConnectEndId("");
                    }
                    return;
                  }
                  if (node.type === "mst") {
                    setSelectedMST(node.id);
                    setSelectedFiber(undefined);
                    setSelectedClosure(undefined);
                    setModalType("mst-details");
                    return;
                  }
                  if (node.type === "closure") {
                    setSelectedClosure(node.id);
                    setSelectedMST(undefined);
                    setSelectedFiber(undefined);
                    setModalType("closure-details");
                  }
                }}
              >
                <Router className="h-4 w-4" />
              </button>
            </Marker>
          );
        })}

        {hoveredCable ? (
          <Popup
            closeButton={false}
            closeOnClick={false}
            longitude={hoveredCable.point.lng}
            latitude={hoveredCable.point.lat}
            anchor="top"
          >
            <p className="text-xs">
              {hoveredCable.cable.coreCount}-core | {hoveredCable.cable.cores.filter((core) => core.status === "used").length} used |{" "}
              {Math.max(
                hoveredCable.cable.coreCount - hoveredCable.cable.cores.filter((core) => core.status === "used").length,
                0,
              )}{" "}
              free
            </p>
          </Popup>
        ) : null}
      </Map>

      <div className="pointer-events-none absolute left-3 top-3 z-10 flex max-w-[min(95vw,880px)] flex-wrap gap-2">
        <div className="pointer-events-auto rounded-xl border border-gray-200 bg-white/95 p-2 shadow-soft backdrop-blur dark:border-border/70 dark:bg-card/90">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <MapPinPlusInside className="h-3.5 w-3.5" />
            Add Infrastructure
          </div>
          <div className="flex gap-1">
            {(["olt", "mst", "pole", "closure"] as const).map((type) => (
              <Button
                key={type}
                size="sm"
                variant={addMode === type ? "default" : "outline"}
                onClick={() => setAddMode((current) => (current === type ? "none" : type))}
              >
                {type.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>

        <div className="pointer-events-auto rounded-xl border border-gray-200 bg-white/95 p-2 text-xs shadow-soft backdrop-blur dark:border-border/70 dark:bg-card/90">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="flex items-center gap-1 uppercase tracking-[0.18em] text-muted-foreground">
              <Link2 className="h-3.5 w-3.5" />
              MST Connection
            </p>
            <Button size="sm" variant={connectMode ? "default" : "outline"} onClick={() => setConnectMode((current) => !current)}>
              {connectMode ? "Connecting..." : "Connect MST"}
            </Button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Select value={connectStartId} onChange={(event) => setConnectStartId(event.target.value)}>
              <option value="">Start MST</option>
              {mstNodes.map((mst) => (
                <option key={mst.id} value={mst.id}>
                  {mst.name}
                </option>
              ))}
            </Select>
            <Select value={connectEndId} onChange={(event) => setConnectEndId(event.target.value)}>
              <option value="">End MST</option>
              {mstNodes.map((mst) => (
                <option key={mst.id} value={mst.id}>
                  {mst.name}
                </option>
              ))}
            </Select>
            <Input value={manualStartLat} onChange={(event) => setManualStartLat(event.target.value)} placeholder="Start lat (optional)" />
            <Input value={manualStartLng} onChange={(event) => setManualStartLng(event.target.value)} placeholder="Start lng (optional)" />
            <Input value={manualEndLat} onChange={(event) => setManualEndLat(event.target.value)} placeholder="End lat (optional)" />
            <Input value={manualEndLng} onChange={(event) => setManualEndLng(event.target.value)} placeholder="End lng (optional)" />
            <Select value={String(coreCount)} onChange={(event) => setCoreCount(Number(event.target.value) as CoreCount)}>
              {fibreCountOptions.map((option) => (
                <option key={option} value={option}>
                  {option}-core
                </option>
              ))}
            </Select>
            <Button onClick={handleCreateConnection}>Create Polyline</Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {previewDistanceMeters > 0 ? `Preview distance: ${previewDistanceMeters}m` : "Pick start/end MST or enter coordinates."}
          </p>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-3 right-3 z-10 rounded-xl border border-gray-200 bg-white/95 p-2 text-xs shadow-soft backdrop-blur dark:border-border/70 dark:bg-card/90">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
          <span>Fault segment</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-teal-400" />
          <span>Healthy fibre</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <TriangleAlert className="h-3.5 w-3.5 text-red-500" />
          <span>MST color = capacity status</span>
        </div>
      </div>

      <MSTDetailsPanel
        open={modalType === "mst-details"}
        node={selectedMst}
        cables={cables}
        customers={customers}
        onAssignClient={onAssignClient ?? (() => undefined)}
        onOpenChange={(open) => {
          if (!open) {
            setModalType(null);
            setSelectedMST(undefined);
          }
        }}
      />

      <FiberDetailsPanel
        open={modalType === "fiber-details"}
        cable={selectedCable}
        nodes={nodes}
        onAssignCore={onAssignCore}
        onOpenChange={(open) => {
          if (!open) {
            setModalType(null);
            setSelectedFiber(undefined);
          }
        }}
      />

      <ClosureSpliceForm
        open={modalType === "closure-details"}
        closure={selectedClosure}
        cables={cables}
        onSave={onSaveSplice ?? (() => undefined)}
        onDelete={onDeleteSplice}
        onOpenChange={(open) => {
          if (!open) {
            setModalType(null);
            setSelectedClosure(undefined);
          }
        }}
      />
    </div>
  );
}
