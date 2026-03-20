"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Map, { Layer, Marker, Popup, Source, type MapMouseEvent, type MapRef, type ViewState } from "react-map-gl/mapbox";
import { MapPinPlusInside, Menu, Search, Router, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import type { ClosureBox, Customer, FibreCable, GeoPoint, NetworkNode } from "@/types";
import { useAppStore } from "@/store/app-store";
import { AddFiberForm } from "@/components/map/add-fiber-form";
import { AddNodeForm } from "@/components/map/add-node-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ClientDropDetailsDrawer } from "@/components/map/client-drop-details-drawer";
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
  onCreateFiber?: (payload: {
    name?: string;
    start: GeoPoint;
    end: GeoPoint;
    coreCount: 2 | 4 | 8 | 12 | 24;
    startMstId?: string;
    endMstId?: string;
  }) => void;
  onAssignCore?: (payload: { cableId: string; coreId: string }) => void;
  onSetCoreState?: (payload: { cableId: string; coreId: string; status: "free" | "used"; fromMstId?: string; toMstId?: string; usagePath?: string; assignedToCustomerId?: string }) => void;
  onDeleteCable?: (payload: { cableId: string }) => void;
  onDeleteMst?: (payload: { mstId: string }) => void;
  onDeleteClosure?: (payload: { closureId: string }) => void;
  onAssignClient?: (payload: {
    mstId: string;
    portNumber: number;
    clientId: string;
    clientName: string;
    fiberCore: string;
    cableId?: string;
    coreId?: string;
  }) => void;
  onRemoveClient?: (payload: { mstId: string; portNumber: number }) => void;
  onChangeSplitterType?: (payload: { mstId: string; splitterType: "1/2" | "1/4" | "1/8" | "1/16" }) => void;
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

const defaultView: Partial<ViewState> = {
  latitude: 6.455,
  longitude: 3.476,
  zoom: 11.8,
};

type SearchEntityType = "mst" | "closure" | "customer-node" | "customer" | "fibre" | "coordinate" | "node" | "place";

type SearchResult = {
  id: string;
  type: SearchEntityType;
  title: string;
  subtitle: string;
  location: GeoPoint;
  entityId?: string;
};

function parseCoordinateSearch(input: string): GeoPoint | null {
  const match = input.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export function MapComponent({
  nodes,
  cables,
  closures = [],
  customers = [],
  className,
  highlightedCableId,
  onInfrastructureAdded,
  onCreateFiber,
  onAssignCore,
  onSetCoreState,
  onDeleteCable,
  onDeleteMst,
  onDeleteClosure,
  onAssignClient,
  onRemoveClient,
  onChangeSplitterType,
  onSaveSplice,
  onDeleteSplice,
}: Props) {
  const mapRef = useRef<MapRef | null>(null);
  const [hoveredCable, setHoveredCable] = useState<{ cable: FibreCable; point: GeoPoint } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [placeResults, setPlaceResults] = useState<SearchResult[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(true);

  const selectedMSTId = useAppStore((state) => state.selectedMSTId);
  const selectedFiberId = useAppStore((state) => state.selectedFiberId);
  const selectedClosureId = useAppStore((state) => state.selectedClosureId);
  const selectedCustomerNodeId = useAppStore((state) => state.selectedCustomerNodeId);
  const modalType = useAppStore((state) => state.modalType);
  const setSelectedMST = useAppStore((state) => state.setSelectedMST);
  const setSelectedFiber = useAppStore((state) => state.setSelectedFiber);
  const setSelectedClosure = useAppStore((state) => state.setSelectedClosure);
  const setSelectedCustomerNode = useAppStore((state) => state.setSelectedCustomerNode);
  const setModalType = useAppStore((state) => state.setModalType);

  const mstNodes = useMemo(() => nodes.filter((node) => node.type === "mst"), [nodes]);
  const closureNodes = useMemo(() => nodes.filter((node) => node.type === "closure"), [nodes]);
  const selectedMst = mstNodes.find((node) => node.id === selectedMSTId);
  const selectedCable = cables.find((cable) => cable.id === selectedFiberId);
  const selectedCustomerNode = nodes.find((node) => node.id === selectedCustomerNodeId && node.type === "customer");
  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerNode || customers.length === 0) return undefined;
    const direct = customers.find((customer) => customer.id === selectedCustomerNode.id);
    if (direct) return direct;

    const nodeName = selectedCustomerNode.name.toLowerCase();
    const byName = customers.find((customer) => {
      const customerName = customer.name.toLowerCase();
      return nodeName.includes(customerName) || customerName.includes(nodeName);
    });
    if (byName) return byName;

    return [...customers].sort((left, right) => {
      const leftDistance = Math.hypot(
        left.location.lat - selectedCustomerNode.location.lat,
        left.location.lng - selectedCustomerNode.location.lng,
      );
      const rightDistance = Math.hypot(
        right.location.lat - selectedCustomerNode.location.lat,
        right.location.lng - selectedCustomerNode.location.lng,
      );
      return leftDistance - rightDistance;
    })[0];
  }, [customers, selectedCustomerNode]);
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

  const nodeNameLookup = useMemo(() => {
    const lookup = new globalThis.Map<string, string>();
    nodes.forEach((node) => lookup.set(node.id, node.name));
    return lookup;
  }, [nodes]);

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [] as SearchResult[];

    const results: SearchResult[] = [];
    const coordinate = parseCoordinateSearch(query);
    if (coordinate) {
      results.push({
        id: `coord-${coordinate.lat}-${coordinate.lng}`,
        type: "coordinate",
        title: `Coordinate ${coordinate.lat.toFixed(5)}, ${coordinate.lng.toFixed(5)}`,
        subtitle: "Jump to typed coordinates",
        location: coordinate,
      });
    }

    nodes.forEach((node) => {
      const haystack = `${node.name} ${node.id} ${node.type}`.toLowerCase();
      if (!haystack.includes(query)) return;
      const kind: SearchEntityType =
        node.type === "mst" ? "mst" : node.type === "closure" ? "closure" : node.type === "customer" ? "customer-node" : "node";
      results.push({
        id: `node-${node.id}`,
        type: kind,
        title: node.name,
        subtitle: `${node.type.toUpperCase()} • ${node.id}`,
        location: node.location,
        entityId: node.id,
      });
    });

    cables.forEach((cable) => {
      const fromName = nodeNameLookup.get(cable.fromNodeId) ?? cable.fromNodeId;
      const toName = nodeNameLookup.get(cable.toNodeId) ?? cable.toNodeId;
      const haystack = `${cable.name} ${cable.id} ${cable.coreCount}-core ${fromName} ${toName}`.toLowerCase();
      if (!haystack.includes(query)) return;
      const middle = cable.coordinates[Math.floor(cable.coordinates.length / 2)] ?? cable.coordinates[0];
      if (!middle) return;
      results.push({
        id: `cable-${cable.id}`,
        type: "fibre",
        title: cable.name,
        subtitle: `${cable.coreCount}-core • ${fromName} -> ${toName}`,
        location: middle,
        entityId: cable.id,
      });
    });

    customers.forEach((customer) => {
      const haystack = `${customer.name} ${customer.id} ${customer.email} ${customer.address}`.toLowerCase();
      if (!haystack.includes(query)) return;
      results.push({
        id: `customer-${customer.id}`,
        type: "customer",
        title: customer.name,
        subtitle: `CRM Customer • ${customer.id}`,
        location: customer.location,
        entityId: customer.id,
      });
    });

    return results.slice(0, 10);
  }, [cables, customers, nodeNameLookup, nodes, searchQuery]);

  useEffect(() => {
    const rawQuery = searchQuery.trim();
    const coordinate = parseCoordinateSearch(rawQuery);
    if (!rawQuery || rawQuery.length < 3 || coordinate || !mapToken) {
      setPlaceResults([]);
      setIsSearchingPlaces(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        setIsSearchingPlaces(true);
        const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(rawQuery)}.json?access_token=${encodeURIComponent(
          mapToken,
        )}&country=ng&types=place,locality,neighborhood,address,poi&limit=6`;
        const response = await fetch(endpoint, { signal: controller.signal });
        if (!response.ok) {
          setPlaceResults([]);
          return;
        }

        const payload = (await response.json()) as {
          features?: Array<{
            id: string;
            place_name: string;
            text?: string;
            center?: [number, number];
          }>;
        };
        const mapped: SearchResult[] = (payload.features ?? [])
          .filter((feature) => Array.isArray(feature.center) && feature.center.length === 2)
          .map((feature) => ({
            id: `place-${feature.id}`,
            type: "place",
            title: feature.text ?? feature.place_name,
            subtitle: feature.place_name,
            location: { lat: feature.center?.[1] as number, lng: feature.center?.[0] as number },
          }));
        setPlaceResults(mapped);
      } catch {
        setPlaceResults([]);
      } finally {
        setIsSearchingPlaces(false);
      }
    }, 350);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [searchQuery]);

  const combinedSearchResults = useMemo(() => {
    const merged = [...searchResults, ...placeResults];
    const unique = merged.filter((result, index, list) => list.findIndex((entry) => entry.id === result.id) === index);
    return unique.slice(0, 12);
  }, [placeResults, searchResults]);

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

  const addInfrastructure = (payload: { type: "mst" | "closure"; name: string; location: GeoPoint }) => {
    const node: NetworkNode = {
      id: randomId(payload.type),
      tenantId: "tenant-temp",
      type: payload.type,
      name: payload.name,
      location: payload.location,
      status: "healthy",
      splitterType: payload.type === "mst" ? "1/8" : undefined,
      splitterPorts:
        payload.type === "mst"
          ? Array.from({ length: 8 }, (_, index) => ({
              port: index + 1,
              status: "free",
            }))
          : undefined,
      clients: payload.type === "mst" ? [] : undefined,
    };
    onInfrastructureAdded?.(node);
    toast.success(`${payload.type.toUpperCase()} created at ${payload.location.lat.toFixed(5)}, ${payload.location.lng.toFixed(5)}.`);
  };

  const applySearchResult = (result: SearchResult) => {
    const zoomTarget = result.type === "place" ? 12.8 : result.type === "coordinate" ? 14.5 : 15.2;
    mapRef.current?.flyTo({
      center: [result.location.lng, result.location.lat],
      zoom: Math.max(zoomTarget, mapRef.current?.getZoom() ?? 0),
      duration: 900,
    });

    if (result.type === "mst" && result.entityId) {
      setSelectedMST(result.entityId);
      setSelectedFiber(undefined);
      setSelectedClosure(undefined);
      setSelectedCustomerNode(undefined);
      setModalType("mst-details");
    } else if (result.type === "closure" && result.entityId) {
      setSelectedClosure(result.entityId);
      setSelectedMST(undefined);
      setSelectedFiber(undefined);
      setSelectedCustomerNode(undefined);
      setModalType("closure-details");
    } else if (result.type === "fibre" && result.entityId) {
      setSelectedFiber(result.entityId);
      setSelectedMST(undefined);
      setSelectedClosure(undefined);
      setSelectedCustomerNode(undefined);
      setModalType("fiber-details");
    } else if (result.type === "customer-node" && result.entityId) {
      setSelectedCustomerNode(result.entityId);
      setSelectedMST(undefined);
      setSelectedFiber(undefined);
      setSelectedClosure(undefined);
      setModalType("customer-details");
    } else if (result.type === "customer" && result.entityId) {
      const mappedNode =
        nodes.find((node) => node.type === "customer" && node.id === result.entityId) ??
        nodes.find((node) => node.type === "customer" && node.name.toLowerCase().includes(result.title.toLowerCase()));
      if (mappedNode) {
        setSelectedCustomerNode(mappedNode.id);
        setSelectedMST(undefined);
        setSelectedFiber(undefined);
        setSelectedClosure(undefined);
        setModalType("customer-details");
      }
    } else {
      setModalType(null);
    }

    setSearchQuery("");
    setPlaceResults([]);
  };

  const handleMapClick = (event: MapMouseEvent) => {
    const lineFeature = event.features?.find((feature) => {
      if (feature.layer.id === "fibre-lines" || feature.layer.id === "fibre-labels" || feature.layer.id === "fault-glow") {
        return true;
      }
      return false;
    });
    const cableIdFromFeature = lineFeature?.id ? String(lineFeature.id) : (lineFeature?.properties?.id as string | undefined);
    if (cableIdFromFeature) {
      const cableId = cableIdFromFeature;
      setSelectedFiber(cableId);
      setSelectedMST(undefined);
      setSelectedClosure(undefined);
      setSelectedCustomerNode(undefined);
      setModalType("fiber-details");
      return;
    }
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
        ref={mapRef}
        initialViewState={defaultView}
        mapboxAccessToken={mapToken}
        mapStyle="mapbox://styles/mapbox/dark-v11"
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
              "text-color": "#E2E8F0",
              "text-halo-color": "#0F172A",
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
                  if (node.type === "mst") {
                    setSelectedMST(node.id);
                    setSelectedFiber(undefined);
                    setSelectedClosure(undefined);
                    setSelectedCustomerNode(undefined);
                    setModalType("mst-details");
                    return;
                  }
                  if (node.type === "closure") {
                    setSelectedClosure(node.id);
                    setSelectedMST(undefined);
                    setSelectedFiber(undefined);
                    setSelectedCustomerNode(undefined);
                    setModalType("closure-details");
                    return;
                  }
                  if (node.type === "customer") {
                    setSelectedCustomerNode(node.id);
                    setSelectedMST(undefined);
                    setSelectedFiber(undefined);
                    setSelectedClosure(undefined);
                    setModalType("customer-details");
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

      <div className="pointer-events-none absolute right-3 top-3 z-20 w-[min(95vw,380px)]">
        <div className="pointer-events-auto rounded-2xl border border-border/70 bg-card/95 p-2 shadow-soft backdrop-blur">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && combinedSearchResults.length > 0) {
                  event.preventDefault();
                  applySearchResult(combinedSearchResults[0]);
                }
              }}
              placeholder="Search MST, closure, fibre, customer, place, or lat,lng"
              className="h-9"
            />
          </div>

          {searchQuery.trim().length > 0 ? (
            <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-xl border border-border/70 bg-background/70 p-1.5">
              {combinedSearchResults.length > 0 ? (
                combinedSearchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    className="w-full rounded-lg px-2 py-1.5 text-left transition hover:bg-muted/50"
                    onClick={() => applySearchResult(result)}
                  >
                    <p className="text-xs font-medium">{result.title}</p>
                    <p className="text-[11px] text-muted-foreground">{result.subtitle}</p>
                  </button>
                ))
              ) : isSearchingPlaces ? (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">Searching locations...</p>
              ) : (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">No result found.</p>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="pointer-events-none absolute left-3 top-3 z-10 grid w-[min(95vw,460px)] gap-2">
        <div className="pointer-events-auto overflow-hidden rounded-2xl border border-border/70 bg-card/92 shadow-soft backdrop-blur">
          <div className="flex items-center justify-between border-b border-border/60 bg-muted/25 px-3 py-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <MapPinPlusInside className="h-3.5 w-3.5" />
              Coordinate Mapping Controls
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setControlsOpen((current) => !current)}
            >
              <Menu className="h-3.5 w-3.5" />
            </Button>
          </div>

          {controlsOpen ? (
            <div className="grid gap-3 p-3">
              <div className="rounded-xl border border-border/70 bg-background/70 p-2">
                <AddNodeForm
                  onSubmit={(payload) => {
                    addInfrastructure(payload);
                  }}
                />
              </div>
              <div className="rounded-xl border border-border/70 bg-background/70 p-2">
                <AddFiberForm
                  mstNodes={mstNodes}
                  onSubmit={(payload) => {
                    if (!onCreateFiber) {
                      toast.error("Fibre creation handler is not configured.");
                      return;
                    }
                    onCreateFiber(payload);
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-3 right-3 z-10 rounded-xl border border-border/70 bg-card/90 p-2 text-xs shadow-soft backdrop-blur">
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
        onRemoveClient={onRemoveClient}
        onChangeSplitterType={onChangeSplitterType}
        onDeleteMst={(payload) => {
          onDeleteMst?.(payload);
          setModalType(null);
          setSelectedMST(undefined);
          setSelectedCustomerNode(undefined);
        }}
        onOpenChange={(open) => {
          if (!open) {
            setModalType(null);
            setSelectedMST(undefined);
            setSelectedCustomerNode(undefined);
          }
        }}
      />

      <FiberDetailsPanel
        open={modalType === "fiber-details"}
        cable={selectedCable}
        nodes={nodes}
        onAssignCore={onAssignCore}
        onSetCoreState={onSetCoreState}
        onDeleteCable={(payload) => {
          onDeleteCable?.(payload);
          setModalType(null);
          setSelectedFiber(undefined);
          setSelectedCustomerNode(undefined);
        }}
        onOpenChange={(open) => {
          if (!open) {
            setModalType(null);
            setSelectedFiber(undefined);
            setSelectedCustomerNode(undefined);
          }
        }}
      />

      <ClosureSpliceForm
        open={modalType === "closure-details"}
        closure={selectedClosure}
        cables={cables}
        onSave={onSaveSplice ?? (() => undefined)}
        onDelete={onDeleteSplice}
        onDeleteClosure={(payload) => {
          onDeleteClosure?.(payload);
          setModalType(null);
          setSelectedClosure(undefined);
          setSelectedCustomerNode(undefined);
        }}
        onOpenChange={(open) => {
          if (!open) {
            setModalType(null);
            setSelectedClosure(undefined);
            setSelectedCustomerNode(undefined);
          }
        }}
      />

      <ClientDropDetailsDrawer
        open={modalType === "customer-details"}
        node={selectedCustomerNode}
        customer={selectedCustomer}
        cables={cables}
        onReleaseConnection={(payload) => onRemoveClient?.(payload)}
        onOpenChange={(open) => {
          if (!open) {
            setModalType(null);
            setSelectedCustomerNode(undefined);
          }
        }}
      />
    </div>
  );
}








