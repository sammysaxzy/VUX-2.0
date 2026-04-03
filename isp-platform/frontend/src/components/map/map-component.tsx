"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Map, { Marker, Popup, type MapMouseEvent, type MapRef, type ViewState } from "react-map-gl/mapbox";
import { Box, GitMerge, Home, MapPinPlusInside, Menu, Network, Search, Server, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { AddFiberForm } from "@/components/map/add-fiber-form";
import { AddNodeForm } from "@/components/map/add-node-form";
import { ClientDropDetailsDrawer } from "@/components/map/client-drop-details-drawer";
import { ClosureSpliceForm } from "@/components/map/closure-splice-form";
import { DeleteConfirmationModal } from "@/components/map/delete-confirmation-modal";
import { FacilityDetailsPanel } from "@/components/map/facility-details-panel";
import { FiberDetailsPanel } from "@/components/map/fiber-details-panel";
import { FiberRouteRenderer, FIBER_ROUTE_LAYER_IDS } from "@/components/map/fiber-route-renderer";
import { MSTDetailsPanel } from "@/components/map/mst-details-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCableDistance } from "@/lib/fibre-routing";
import { cn, randomId } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { useThemeStore } from "@/store/theme-store";
import type { ClosureBox, Customer, FibreCable, Fault, GeoPoint, NetworkNode } from "@/types";

const mapToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

type Props = {
  nodes: NetworkNode[];
  cables: FibreCable[];
  faults?: Fault[];
  closures?: ClosureBox[];
  customers?: Customer[];
  className?: string;
  onInfrastructureAdded?: (node: NetworkNode) => void;
  onUpdateNode?: (node: NetworkNode) => void;
  onSeedFault?: () => void;
  onCreateFiber?: (payload: {
    name?: string;
    start: GeoPoint;
    end: GeoPoint;
    coreCount: 2 | 4 | 8 | 12 | 24;
    startMstId?: string;
    endMstId?: string;
  }) => void | Promise<void>;
  onAssignCore?: (payload: { cableId: string; coreId: string }) => void;
  onSetCoreState?: (payload: {
    cableId: string;
    coreId: string;
    status: "free" | "used";
    fromMstId?: string;
    toMstId?: string;
    usagePath?: string;
    assignedToCustomerId?: string;
  }) => void;
  onDeleteCable?: (payload: { cableId: string }) => void;
  onDeleteMst?: (payload: { mstId: string }) => void;
  onDeleteNode?: (payload: { nodeId: string }) => void;
  onDeleteClosure?: (payload: { closureId: string }) => void;
  onAddNote?: (payload: { nodeId: string; note: string }) => void;
  onAssignClient?: (payload: {
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
  focusCustomerId?: string;
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canAssignClient?: boolean;
  workHistory?: Array<{ id: string; nodeId?: string; message: string; timestamp: string }>;
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

type PendingDeletion =
  | { type: "mst"; id: string; label: string }
  | { type: "closure"; id: string; label: string }
  | { type: "cable"; id: string; label: string }
  | { type: "facility"; id: string; label: string };

function resolveTheme(mode: "light" | "dark" | "system"): "light" | "dark" {
  if (mode !== "system") return mode;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

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
  faults = [],
  closures = [],
  customers = [],
  className,
  highlightedCableId,
  focusCustomerId,
  onInfrastructureAdded,
  onUpdateNode,
  onSeedFault,
  onCreateFiber,
  onAssignCore,
  onSetCoreState,
  onDeleteCable,
  onDeleteMst,
  onDeleteNode,
  onDeleteClosure,
  onAddNote,
  onAssignClient,
  onRemoveClient,
  onChangeSplitterType,
  onSaveSplice,
  onDeleteSplice,
  canAdd = true,
  canEdit = true,
  canDelete = false,
  canAssignClient = true,
  workHistory = [],
}: Props) {
  const theme = useThemeStore((state) => state.theme);
  const mapRef = useRef<MapRef | null>(null);
  const [hoveredCable, setHoveredCable] = useState<{ cable: FibreCable; point: GeoPoint } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [placeResults, setPlaceResults] = useState<SearchResult[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(true);
  const [pickedClientLocation, setPickedClientLocation] = useState<GeoPoint | undefined>();
  const [isPickingClientLocation, setIsPickingClientLocation] = useState(false);
  const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [hoveredNode, setHoveredNode] = useState<NetworkNode | null>(null);
  const [flowView, setFlowView] = useState(false);

  const selectedMSTId = useAppStore((state) => state.selectedMSTId);
  const selectedFiberId = useAppStore((state) => state.selectedFiberId);
  const selectedClosureId = useAppStore((state) => state.selectedClosureId);
  const selectedCustomerNodeId = useAppStore((state) => state.selectedCustomerNodeId);
  const selectedClientId = useAppStore((state) => state.selectedClientId);
  const selectedOdfId = useAppStore((state) => state.selectedOdfId);
  const selectedCabinetId = useAppStore((state) => state.selectedCabinetId);
  const modalType = useAppStore((state) => state.modalType);
  const setSelectedMST = useAppStore((state) => state.setSelectedMST);
  const setSelectedFiber = useAppStore((state) => state.setSelectedFiber);
  const setSelectedClosure = useAppStore((state) => state.setSelectedClosure);
  const setSelectedCustomerNode = useAppStore((state) => state.setSelectedCustomerNode);
  const setSelectedClient = useAppStore((state) => state.setSelectedClient);
  const setSelectedOdf = useAppStore((state) => state.setSelectedOdf);
  const setSelectedCabinet = useAppStore((state) => state.setSelectedCabinet);
  const setModalType = useAppStore((state) => state.setModalType);

  const mstNodes = useMemo(() => nodes.filter((node) => node.type === "mst"), [nodes]);
  const closureNodes = useMemo(() => nodes.filter((node) => node.type === "closure"), [nodes]);
  const filteredNodes = useMemo(() => {
    if (!activeFilters.size) return nodes;
    return nodes.filter((node) => activeFilters.has(node.type));
  }, [activeFilters, nodes]);
  const selectedMst = mstNodes.find((node) => node.id === selectedMSTId);
  const selectedOdf = nodes.find((node) => node.id === selectedOdfId && node.type === "odf");
  const selectedCabinet = nodes.find((node) => node.id === selectedCabinetId && node.type === "cabinet");
  const selectedCable = cables.find((cable) => cable.id === selectedFiberId);
  const selectedCustomerNode = nodes.find((node) => node.id === selectedCustomerNodeId && node.type === "customer");
  const mstHistory = useMemo(
    () => workHistory.filter((entry) => entry.nodeId === selectedMSTId),
    [selectedMSTId, workHistory],
  );
  const odfHistory = useMemo(
    () => workHistory.filter((entry) => entry.nodeId === selectedOdfId),
    [selectedOdfId, workHistory],
  );
  const cabinetHistory = useMemo(
    () => workHistory.filter((entry) => entry.nodeId === selectedCabinetId),
    [selectedCabinetId, workHistory],
  );
  const closureHistory = useMemo(
    () => workHistory.filter((entry) => entry.nodeId === selectedClosureId),
    [selectedClosureId, workHistory],
  );
  const activeFaults = faults.filter((fault) => fault.status !== "resolved");
  const hoveredNodeSummary = useMemo(() => {
    if (!hoveredNode) return "";
    if (hoveredNode.type === "mst") {
      const usedPorts = hoveredNode.splitterPorts?.filter((port) => port.status === "used").length ?? 0;
      const totalPorts = hoveredNode.splitterPorts?.length ?? 0;
      const freePorts = Math.max(totalPorts - usedPorts, 0);
      return `${hoveredNode.name} | ${usedPorts} used | ${freePorts} free`;
    }
    return `${hoveredNode.name} | ${hoveredNode.type.toUpperCase()}`;
  }, [hoveredNode]);

  const renderNodeMarker = (node: NetworkNode) => {
    if (flowView) {
      return (
        <Marker key={node.id} longitude={node.location.lng} latitude={node.location.lat} anchor="bottom">
          <button
            type="button"
            className="rounded-full border border-border/60 bg-background/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground shadow-soft"
            onMouseEnter={() => setHoveredNode(node)}
            onMouseLeave={() => setHoveredNode(null)}
            onClick={(event) => {
              event.stopPropagation();
              if (node.type === "mst") {
                setSelectedMST(node.id);
                setSelectedFiber(undefined);
                setSelectedClosure(undefined);
                setSelectedCustomerNode(undefined);
                setSelectedClient(undefined);
                setSelectedOdf(undefined);
                setSelectedCabinet(undefined);
                setModalType("mst-details");
                return;
              }
              if (node.type === "closure") {
                setSelectedClosure(node.id);
                setSelectedMST(undefined);
                setSelectedFiber(undefined);
                setSelectedCustomerNode(undefined);
                setSelectedClient(undefined);
                setSelectedOdf(undefined);
                setSelectedCabinet(undefined);
                setModalType("closure-details");
                return;
              }
              if (node.type === "odf") {
                setSelectedOdf(node.id);
                setSelectedCabinet(undefined);
                setSelectedMST(undefined);
                setSelectedFiber(undefined);
                setSelectedClosure(undefined);
                setSelectedCustomerNode(undefined);
                setSelectedClient(undefined);
                setModalType("odf-details");
                return;
              }
              if (node.type === "cabinet") {
                setSelectedCabinet(node.id);
                setSelectedOdf(undefined);
                setSelectedMST(undefined);
                setSelectedFiber(undefined);
                setSelectedClosure(undefined);
                setSelectedCustomerNode(undefined);
                setSelectedClient(undefined);
                setModalType("cabinet-details");
                return;
              }
              if (node.type === "customer") {
                setSelectedCustomerNode(node.id);
                setSelectedClient(node.id);
                setSelectedMST(undefined);
                setSelectedFiber(undefined);
                setSelectedClosure(undefined);
                setSelectedOdf(undefined);
                setSelectedCabinet(undefined);
                setModalType("customer-details");
              }
            }}
          >
            {node.type.toUpperCase()}
          </button>
        </Marker>
      );
    }

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
            node.type === "odf" && "border-indigo-100 bg-indigo-600",
            node.type === "cabinet" && "border-amber-100 bg-amber-600",
            node.type === "mst" && mstColorClass,
            node.type === "pole" && "border-amber-100 bg-amber-600",
            node.type === "closure" && "border-fuchsia-100 bg-fuchsia-600",
            node.type === "customer" && "border-blue-100 bg-blue-600",
            node.status === "fault" && "animate-pulse border-red-100 bg-red-600",
          )}
          onMouseEnter={() => setHoveredNode(node)}
          onMouseLeave={() => setHoveredNode(null)}
          onClick={(event) => {
            event.stopPropagation();
            if (node.type === "mst") {
              setSelectedMST(node.id);
              setSelectedFiber(undefined);
              setSelectedClosure(undefined);
              setSelectedCustomerNode(undefined);
              setSelectedClient(undefined);
              setSelectedOdf(undefined);
              setSelectedCabinet(undefined);
              setModalType("mst-details");
              return;
            }
            if (node.type === "closure") {
              setSelectedClosure(node.id);
              setSelectedMST(undefined);
              setSelectedFiber(undefined);
              setSelectedCustomerNode(undefined);
              setSelectedClient(undefined);
              setSelectedOdf(undefined);
              setSelectedCabinet(undefined);
              setModalType("closure-details");
              return;
            }
            if (node.type === "odf") {
              setSelectedOdf(node.id);
              setSelectedCabinet(undefined);
              setSelectedMST(undefined);
              setSelectedFiber(undefined);
              setSelectedClosure(undefined);
              setSelectedCustomerNode(undefined);
              setSelectedClient(undefined);
              setModalType("odf-details");
              return;
            }
            if (node.type === "cabinet") {
              setSelectedCabinet(node.id);
              setSelectedOdf(undefined);
              setSelectedMST(undefined);
              setSelectedFiber(undefined);
              setSelectedClosure(undefined);
              setSelectedCustomerNode(undefined);
              setSelectedClient(undefined);
              setModalType("cabinet-details");
              return;
            }
            if (node.type === "customer") {
              setSelectedCustomerNode(node.id);
              setSelectedClient(node.id);
              setSelectedMST(undefined);
              setSelectedFiber(undefined);
              setSelectedClosure(undefined);
              setSelectedOdf(undefined);
              setSelectedCabinet(undefined);
              setModalType("customer-details");
            }
          }}
        >
          {node.type === "odf" ? (
            <Server className="h-4 w-4" />
          ) : node.type === "cabinet" ? (
            <Box className="h-4 w-4" />
          ) : node.type === "mst" ? (
            <Network className="h-4 w-4" />
          ) : node.type === "closure" ? (
            <GitMerge className="h-4 w-4" />
          ) : node.type === "customer" ? (
            <Home className="h-4 w-4" />
          ) : (
            <Network className="h-4 w-4" />
          )}
        </button>
      </Marker>
    );
  };
  const selectedCustomer = useMemo(() => {
    if (customers.length === 0) return undefined;
    const directBySelection = selectedClientId ? customers.find((customer) => customer.id === selectedClientId) : undefined;
    if (directBySelection) return directBySelection;
    if (!selectedCustomerNode) return undefined;
    const direct = customers.find((customer) => customer.id === selectedCustomerNode.id);
    if (direct) return direct;

    const nodeName = selectedCustomerNode.name.toLowerCase();
    const byName = customers.find((customer) => {
      const customerName = customer.name.toLowerCase();
      return nodeName.includes(customerName) || customerName.includes(nodeName);
    });
    if (byName) return byName;

    return [...customers].sort((left, right) => {
      const leftDistance = Math.hypot(left.location.lat - selectedCustomerNode.location.lat, left.location.lng - selectedCustomerNode.location.lng);
      const rightDistance = Math.hypot(right.location.lat - selectedCustomerNode.location.lat, right.location.lng - selectedCustomerNode.location.lng);
      return leftDistance - rightDistance;
    })[0];
  }, [customers, selectedClientId, selectedCustomerNode]);

  useEffect(() => {
    if (flowView) {
      setHoveredCable(null);
      setHoveredNode(null);
    }
  }, [flowView]);

  useEffect(() => {
    if (!focusCustomerId) return;
    const targetNode = nodes.find((node) => node.type === "customer" && node.id === focusCustomerId);
    if (!targetNode) return;
    mapRef.current?.flyTo({
      center: [targetNode.location.lng, targetNode.location.lat],
      zoom: Math.max(15, mapRef.current?.getZoom() ?? 0),
      duration: 900,
    });
    setSelectedCustomerNode(targetNode.id);
    setSelectedClient(targetNode.id);
    setSelectedMST(undefined);
    setSelectedFiber(undefined);
    setSelectedClosure(undefined);
    setSelectedOdf(undefined);
    setSelectedCabinet(undefined);
    setModalType("customer-details");
  }, [
    focusCustomerId,
    nodes,
    setModalType,
    setSelectedCabinet,
    setSelectedClosure,
    setSelectedCustomerNode,
    setSelectedClient,
    setSelectedFiber,
    setSelectedMST,
    setSelectedOdf,
  ]);
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
  const nodeLookup = useMemo<Record<string, string>>(() => {
    const lookup: Record<string, string> = {};
    nodes.forEach((node) => {
      lookup[node.id] = node.name;
    });
    return lookup;
  }, [nodes]);

  const resolvedTheme = resolveTheme(theme);
  const mapStyle = resolvedTheme === "dark" ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11";

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

    filteredNodes.forEach((node) => {
      const haystack = `${node.name} ${node.id} ${node.type}`.toLowerCase();
      if (!haystack.includes(query)) return;
      const kind: SearchEntityType =
        node.type === "mst" ? "mst" : node.type === "closure" ? "closure" : node.type === "customer" ? "customer-node" : "node";
      results.push({
        id: `node-${node.id}`,
        type: kind,
        title: node.name,
        subtitle: `${node.type.toUpperCase()} | ${node.id}`,
        location: node.location,
        entityId: node.id,
      });
    });

    cables.forEach((cable) => {
      const fromName = nodeNameLookup.get(cable.fromNodeId) ?? cable.fromNodeId;
      const toName = nodeNameLookup.get(cable.toNodeId) ?? cable.toNodeId;
      const haystack = `${cable.name} ${cable.id} ${cable.coreCount}-core ${fromName} ${toName}`.toLowerCase();
      if (!haystack.includes(query)) return;
      const cablePath = cable.geometry?.length ? cable.geometry : cable.coordinates;
      const middle = cablePath[Math.floor(cablePath.length / 2)] ?? cablePath[0];
      if (!middle) return;
      results.push({
        id: `cable-${cable.id}`,
        type: "fibre",
        title: cable.name,
        subtitle: `${cable.coreCount}-core | ${fromName} -> ${toName}`,
        location: middle,
        entityId: cable.id,
      });
    });

    const filterCustomers = activeFilters.size === 0 || activeFilters.has("customer");
    if (filterCustomers) {
      customers.forEach((customer) => {
        const haystack = `${customer.name} ${customer.id} ${customer.email} ${customer.address}`.toLowerCase();
        if (!haystack.includes(query)) return;
        results.push({
        id: `customer-${customer.id}`,
        type: "customer",
        title: customer.name,
        subtitle: `CRM Customer | ${customer.id}`,
        location: customer.location,
        entityId: customer.id,
      });
      });
    }

    return results.slice(0, 10);
  }, [activeFilters, cables, customers, filteredNodes, nodeNameLookup, searchQuery]);

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

  const addInfrastructure = (payload: {
    type: "odf" | "cabinet" | "mst" | "closure" | "customer";
    name: string;
    location: GeoPoint;
  }) => {
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
      facilityCables: payload.type === "odf" || payload.type === "cabinet" ? [] : undefined,
      facilitySplices: payload.type === "odf" || payload.type === "cabinet" ? [] : undefined,
    };
    onInfrastructureAdded?.(node);
    toast.success(`${payload.type.toUpperCase()} created at ${payload.location.lat.toFixed(5)}, ${payload.location.lng.toFixed(5)}.`);
  };

  const seedFacilityDemo = () => {
    const center = mapRef.current?.getCenter();
    const seedLat = center?.lat ?? defaultView.latitude ?? 6.455;
    const seedLng = center?.lng ?? defaultView.longitude ?? 3.476;
    const odfId = randomId("odf");
    const cabinetId = randomId("cab");
    const odfNode: NetworkNode = {
      id: odfId,
      tenantId: "tenant-temp",
      type: "odf",
      name: "ODF Demo Hub",
      location: { lat: seedLat + 0.002, lng: seedLng + 0.002 },
      status: "healthy",
      facilityCables: [],
      facilitySplices: [],
    };
    const cabinetNode: NetworkNode = {
      id: cabinetId,
      tenantId: "tenant-temp",
      type: "cabinet",
      name: "Cabinet Demo Hub",
      location: { lat: seedLat - 0.0015, lng: seedLng - 0.001 },
      status: "healthy",
      facilityCables: [],
      facilitySplices: [],
    };

    onInfrastructureAdded?.(odfNode);
    onInfrastructureAdded?.(cabinetNode);

    const [firstCable, secondCable] = cables;
    if (firstCable) {
      onUpdateNode?.({
        ...odfNode,
        facilityCables: [{ cableId: firstCable.id, notes: "Seeded backbone termination." }],
      });
    }
    if (secondCable) {
      onUpdateNode?.({
        ...cabinetNode,
        facilityCables: [{ cableId: secondCable.id, notes: "Seeded distribution segment." }],
      });
    }

    setSelectedOdf(odfId);
    setSelectedCabinet(undefined);
    setSelectedMST(undefined);
    setSelectedFiber(undefined);
    setSelectedClosure(undefined);
    setSelectedCustomerNode(undefined);
    setSelectedClient(undefined);
    setModalType("odf-details");
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
      setSelectedClient(undefined);
      setSelectedOdf(undefined);
      setSelectedCabinet(undefined);
      setModalType("mst-details");
    } else if (result.type === "closure" && result.entityId) {
      setSelectedClosure(result.entityId);
      setSelectedMST(undefined);
      setSelectedFiber(undefined);
      setSelectedCustomerNode(undefined);
      setSelectedClient(undefined);
      setSelectedOdf(undefined);
      setSelectedCabinet(undefined);
      setModalType("closure-details");
    } else if (result.type === "fibre" && result.entityId) {
      setSelectedFiber(result.entityId);
      setSelectedMST(undefined);
      setSelectedClosure(undefined);
      setSelectedCustomerNode(undefined);
      setSelectedClient(undefined);
      setSelectedOdf(undefined);
      setSelectedCabinet(undefined);
      setModalType("fiber-details");
    } else if (result.type === "customer-node" && result.entityId) {
      setSelectedCustomerNode(result.entityId);
      setSelectedClient(result.entityId);
      setSelectedMST(undefined);
      setSelectedFiber(undefined);
      setSelectedClosure(undefined);
      setSelectedOdf(undefined);
      setSelectedCabinet(undefined);
      setModalType("customer-details");
    } else if (result.type === "node" && result.entityId) {
      const targetNode = nodes.find((node) => node.id === result.entityId);
      if (targetNode?.type === "odf") {
        setSelectedOdf(targetNode.id);
        setSelectedCabinet(undefined);
        setSelectedMST(undefined);
        setSelectedFiber(undefined);
        setSelectedClosure(undefined);
        setSelectedCustomerNode(undefined);
        setSelectedClient(undefined);
        setModalType("odf-details");
      } else if (targetNode?.type === "cabinet") {
        setSelectedCabinet(targetNode.id);
        setSelectedOdf(undefined);
        setSelectedMST(undefined);
        setSelectedFiber(undefined);
        setSelectedClosure(undefined);
        setSelectedCustomerNode(undefined);
        setSelectedClient(undefined);
        setModalType("cabinet-details");
      }
    } else if (result.type === "customer" && result.entityId) {
      const mappedNode =
        nodes.find((node) => node.type === "customer" && node.id === result.entityId) ??
        nodes.find((node) => node.type === "customer" && node.name.toLowerCase().includes(result.title.toLowerCase()));
      if (mappedNode) {
        setSelectedCustomerNode(mappedNode.id);
        setSelectedClient(result.entityId);
        setSelectedMST(undefined);
        setSelectedFiber(undefined);
        setSelectedClosure(undefined);
        setSelectedOdf(undefined);
        setSelectedCabinet(undefined);
        setModalType("customer-details");
      }
    } else {
      setSelectedClient(undefined);
      setModalType(null);
    }

    setSearchQuery("");
    setPlaceResults([]);
  };

  const handleMapClick = (event: MapMouseEvent) => {
    if (isPickingClientLocation) {
      setPickedClientLocation({ lat: event.lngLat.lat, lng: event.lngLat.lng });
      setIsPickingClientLocation(false);
      toast.success("Client location captured from map.");
      return;
    }

    const lineFeature = event.features?.find((feature) => {
      if (feature.layer.id === "fibre-lines" || feature.layer.id === "fibre-labels" || feature.layer.id === "fault-glow") {
        return true;
      }
      return false;
    });
    const cableIdFromFeature = lineFeature?.id ? String(lineFeature.id) : (lineFeature?.properties?.id as string | undefined);
    if (cableIdFromFeature) {
      setSelectedFiber(cableIdFromFeature);
      setSelectedMST(undefined);
      setSelectedClosure(undefined);
      setSelectedCustomerNode(undefined);
      setSelectedClient(undefined);
      setModalType("fiber-details");
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
        mapStyle={mapStyle}
        interactiveLayerIds={[...FIBER_ROUTE_LAYER_IDS]}
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
        <FiberRouteRenderer
          cables={cables.map((cable) => ({
            ...cable,
            flowDirection:
              flowView && selectedMst?.id
                ? cable.toNodeId === selectedMst.id
                  ? "incoming"
                  : cable.fromNodeId === selectedMst.id
                    ? "outgoing"
                    : cable.segmentType === "drop"
                      ? "drop"
                      : "outgoing"
                : cable.segmentType === "drop"
                  ? "drop"
                  : "outgoing",
          }))}
          highlightedCableId={highlightedCableId}
          resolvedTheme={resolvedTheme}
        />

        {filteredNodes.map((node) => renderNodeMarker(node))}

        {!flowView &&
          activeFaults.map((fault) => (
          <Marker key={fault.id} longitude={fault.location.lng} latitude={fault.location.lat} anchor="bottom">
            <div className="flex flex-col items-center gap-1">
              <div className="grid h-6 w-6 place-content-center rounded-full border border-red-200 bg-red-600 text-white shadow-lg animate-pulse">
                <TriangleAlert className="h-3.5 w-3.5" />
              </div>
              <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                Fibre Cut
              </span>
            </div>
          </Marker>
          ))}

        {!flowView && hoveredCable ? (
          <Popup closeButton={false} closeOnClick={false} longitude={hoveredCable.point.lng} latitude={hoveredCable.point.lat} anchor="top">
            <p className="text-xs">
              {hoveredCable.cable.segmentType === "drop" ? "Client drop" : `${hoveredCable.cable.coreCount}-core`} | {formatCableDistance(hoveredCable.cable.distanceMeters)} |{" "}
              {hoveredCable.cable.routeMode === "road" ? "Road route" : "Fallback line"} |{" "}
              {hoveredCable.cable.cores.filter((core) => core.status === "used").length} used |{" "}
              {Math.max(
                hoveredCable.cable.coreCount - hoveredCable.cable.cores.filter((core) => core.status === "used").length,
                0,
              )}{" "}
              free
            </p>
          </Popup>
        ) : null}

        {!flowView && hoveredNode ? (
          <Popup closeButton={false} closeOnClick={false} longitude={hoveredNode.location.lng} latitude={hoveredNode.location.lat} anchor="top">
            <p className="text-xs">{hoveredNodeSummary}</p>
          </Popup>
        ) : null}
      </Map>

      <div className="pointer-events-none absolute right-3 top-3 z-20 w-[min(95vw,380px)]">
        <div className="pointer-events-auto rounded-2xl border border-border/70 bg-card/95 p-2 shadow-soft backdrop-blur">
          <div className="flex items-center justify-between gap-2">
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
                disabled={flowView}
              />
            </div>
            <Button type="button" size="sm" variant={flowView ? "default" : "outline"} onClick={() => setFlowView((current) => !current)}>
              {flowView ? "Flow View On" : "Flow View"}
            </Button>
          </div>
          {!flowView ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              {[
                { label: "MST", value: "mst" },
                { label: "Cabinet", value: "cabinet" },
                { label: "ODF", value: "odf" },
                { label: "Closure", value: "closure" },
                { label: "Client", value: "customer" },
              ].map((filter) => {
                const isActive = activeFilters.has(filter.value);
                return (
                  <Button
                    key={filter.value}
                    type="button"
                    size="sm"
                    variant={isActive ? "default" : "outline"}
                    onClick={() => {
                      setActiveFilters((prev) => {
                        const next = new Set(prev);
                        if (next.has(filter.value)) {
                          next.delete(filter.value);
                        } else {
                          next.add(filter.value);
                        }
                        return next;
                      });
                    }}
                  >
                    {filter.label}
                  </Button>
                );
              })}
              {activeFilters.size > 0 ? (
                <Button type="button" size="sm" variant="ghost" onClick={() => setActiveFilters(new Set())}>
                  Clear
                </Button>
              ) : null}
            </div>
          ) : null}

          {!flowView && searchQuery.trim().length > 0 ? (
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


      {!flowView ? (
        <div className="pointer-events-none absolute left-3 top-3 z-10 grid w-[min(95vw,460px)] gap-2">
          <div className="pointer-events-auto overflow-hidden rounded-2xl border border-border/70 bg-card/92 shadow-soft backdrop-blur">
            <div className="flex items-center justify-between border-b border-border/60 bg-muted/25 px-3 py-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <MapPinPlusInside className="h-3.5 w-3.5" />
                Field Workflow
              </div>
              <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => setControlsOpen((current) => !current)}>
                <Menu className="h-3.5 w-3.5" />
              </Button>
            </div>

          {controlsOpen ? (
            <div className="grid gap-3 p-3">
              <div className="rounded-xl border border-border/70 bg-background/70 p-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Step 1: Add Infrastructure</p>
                <AddNodeForm
                  onSubmit={(payload) => {
                    if (!canAdd) {
                      toast.error("Your role is read-only on the map.");
                      return;
                    }
                    if (flowView) {
                      toast.error("Turn off Flow View to add or edit infrastructure.");
                      return;
                    }
                    addInfrastructure(payload);
                  }}
                />
              </div>
              <div className="rounded-xl border border-border/70 bg-background/70 p-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Step 2: Connect Infrastructure</p>
                <AddFiberForm
                  mstNodes={mstNodes}
                  onSubmit={(payload) => {
                    if (!canAdd) {
                      toast.error("Your role is read-only on the map.");
                      return;
                    }
                    if (flowView) {
                      toast.error("Turn off Flow View to add or edit infrastructure.");
                      return;
                    }
                    if (!onCreateFiber) {
                      toast.error("Fibre creation handler is not configured.");
                      return;
                    }
                    onCreateFiber(payload);
                  }}
                />
              </div>
              <div className="rounded-xl border border-border/70 bg-background/70 p-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Step 3: Define Flow</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Use the infrastructure panel to mark incoming (power) and outgoing (distribution) paths.
                </p>
                <Button type="button" size="sm" className="mt-2 w-full" disabled={!canAdd} onClick={seedFacilityDemo}>
                  Seed ODF + Cabinet
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-2 w-full"
                  disabled={!canEdit}
                  onClick={() => onSeedFault?.()}
                >
                  Seed Fibre Cut
                </Button>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/70 p-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Step 4: Assign Clients</p>
                <p className="mt-1 text-xs text-muted-foreground">Click an MST, then use Assign Client to draw a drop line.</p>
              </div>
            </div>
          ) : null}
          </div>
        </div>
      ) : null}

      {!flowView ? (
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
        <div className="mt-1 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
          <span>Client drop</span>
        </div>
        </div>
      ) : null}

      {flowView ? (
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-xl border border-border/70 bg-background/85 p-2 text-xs shadow-soft backdrop-blur">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Cable Flow Legend</p>
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-6 rounded-full bg-teal-500" />
              <span>Incoming (Power)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-6 rounded-full bg-emerald-600" />
              <span>Outgoing (Distribution)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-6 rounded-full bg-blue-600" />
              <span>Client Drop</span>
            </div>
          </div>
        </div>
      ) : null}

      <MSTDetailsPanel
        open={modalType === "mst-details"}
        node={selectedMst}
        cables={cables}
        customers={customers}
        historyEntries={mstHistory}
        nodeLookup={nodeLookup}
        onAddNote={onAddNote}
        canAddNote={canEdit}
        pickedClientLocation={pickedClientLocation}
        isPickingClientLocation={isPickingClientLocation}
        canEdit={canEdit && canAssignClient}
        canDelete={canDelete}
        onStartClientLocationPick={() => {
          setPickedClientLocation(undefined);
          setIsPickingClientLocation(true);
          toast.info("Click the client location on the map to continue.");
        }}
        onAssignClient={onAssignClient ?? (() => undefined)}
        onRemoveClient={(payload) => {
          if (!canDelete) {
            toast.error("Your role cannot remove client connections.");
            return;
          }
          onRemoveClient?.(payload);
        }}
        onChangeSplitterType={onChangeSplitterType}
        onDeleteMst={(payload) => {
          if (!canDelete) {
            toast.error("Your role cannot delete infrastructure.");
            return;
          }
          const targetNode = nodes.find((node) => node.id === payload.mstId);
          setPendingDeletion({ type: "mst", id: payload.mstId, label: targetNode?.name ?? payload.mstId });
        }}
        onOpenChange={(open) => {
          if (!open) {
            setModalType(null);
            setSelectedMST(undefined);
            setSelectedCustomerNode(undefined);
            setSelectedClient(undefined);
            setPickedClientLocation(undefined);
            setIsPickingClientLocation(false);
          }
        }}
      />

      <FacilityDetailsPanel
        open={modalType === "odf-details"}
        node={selectedOdf}
        cables={cables}
        historyEntries={odfHistory}
        nodeLookup={nodeLookup}
        onAddNote={onAddNote}
        canAddNote={canEdit}
        canEdit={canEdit}
        canDelete={canDelete}
        title={selectedOdf ? selectedOdf.name : "ODF Details"}
        description="ODF termination, buffers, and splice tracking"
        onAttachCable={(payload) => {
          if (!selectedOdf) return;
          onUpdateNode?.({
            ...selectedOdf,
            facilityCables: [
              ...(selectedOdf.facilityCables ?? []),
              { cableId: payload.link.cableId, notes: payload.link.notes },
            ],
          });
        }}
        onDetachCable={(payload) => {
          if (!selectedOdf) return;
          onUpdateNode?.({
            ...selectedOdf,
            facilityCables: (selectedOdf.facilityCables ?? []).filter((link) => link.cableId !== payload.cableId),
          });
        }}
        onUpsertSplice={(payload) => {
          if (!selectedOdf) return;
          const nextSplices = [...(selectedOdf.facilitySplices ?? []), payload.splice];
          onUpdateNode?.({ ...selectedOdf, facilitySplices: nextSplices });
        }}
        onDeleteSplice={(payload) => {
          if (!selectedOdf) return;
          onUpdateNode?.({
            ...selectedOdf,
            facilitySplices: (selectedOdf.facilitySplices ?? []).filter((splice) => splice.id !== payload.spliceId),
          });
        }}
        onDeleteNode={(payload) => {
          if (!canDelete) {
            toast.error("Your role cannot delete infrastructure.");
            return;
          }
          const targetNode = nodes.find((node) => node.id === payload.nodeId);
          setPendingDeletion({ type: "facility", id: payload.nodeId, label: targetNode?.name ?? payload.nodeId });
        }}
        onSetCoreState={(payload) => onSetCoreState?.(payload)}
        onOpenChange={(open) => {
          if (!open) {
            setModalType(null);
            setSelectedOdf(undefined);
          }
        }}
      />

      <FacilityDetailsPanel
        open={modalType === "cabinet-details"}
        node={selectedCabinet}
        cables={cables}
        historyEntries={cabinetHistory}
        nodeLookup={nodeLookup}
        onAddNote={onAddNote}
        canAddNote={canEdit}
        canEdit={canEdit}
        canDelete={canDelete}
        title={selectedCabinet ? selectedCabinet.name : "Cabinet Details"}
        description="Distribution hub buffers and splice management"
        onAttachCable={(payload) => {
          if (!selectedCabinet) return;
          onUpdateNode?.({
            ...selectedCabinet,
            facilityCables: [
              ...(selectedCabinet.facilityCables ?? []),
              { cableId: payload.link.cableId, notes: payload.link.notes },
            ],
          });
        }}
        onDetachCable={(payload) => {
          if (!selectedCabinet) return;
          onUpdateNode?.({
            ...selectedCabinet,
            facilityCables: (selectedCabinet.facilityCables ?? []).filter((link) => link.cableId !== payload.cableId),
          });
        }}
        onUpsertSplice={(payload) => {
          if (!selectedCabinet) return;
          const nextSplices = [...(selectedCabinet.facilitySplices ?? []), payload.splice];
          onUpdateNode?.({ ...selectedCabinet, facilitySplices: nextSplices });
        }}
        onDeleteSplice={(payload) => {
          if (!selectedCabinet) return;
          onUpdateNode?.({
            ...selectedCabinet,
            facilitySplices: (selectedCabinet.facilitySplices ?? []).filter((splice) => splice.id !== payload.spliceId),
          });
        }}
        onDeleteNode={(payload) => {
          if (!canDelete) {
            toast.error("Your role cannot delete infrastructure.");
            return;
          }
          const targetNode = nodes.find((node) => node.id === payload.nodeId);
          setPendingDeletion({ type: "facility", id: payload.nodeId, label: targetNode?.name ?? payload.nodeId });
        }}
        onSetCoreState={(payload) => onSetCoreState?.(payload)}
        onOpenChange={(open) => {
          if (!open) {
            setModalType(null);
            setSelectedCabinet(undefined);
          }
        }}
      />

      <FiberDetailsPanel
        open={modalType === "fiber-details"}
        cable={selectedCable}
        nodes={nodes}
        canEdit={canEdit}
        canDelete={canDelete}
        onAssignCore={onAssignCore}
        onSetCoreState={onSetCoreState}
        onDeleteCable={(payload) => {
          if (!canDelete) {
            toast.error("Your role cannot delete fibre routes.");
            return;
          }
          const targetCable = cables.find((cable) => cable.id === payload.cableId);
          setPendingDeletion({ type: "cable", id: payload.cableId, label: targetCable?.name ?? payload.cableId });
        }}
        onOpenChange={(open) => {
          if (!open) {
            setModalType(null);
            setSelectedFiber(undefined);
            setSelectedCustomerNode(undefined);
            setSelectedClient(undefined);
          }
        }}
      />

      <ClosureSpliceForm
        open={modalType === "closure-details"}
        closure={selectedClosure}
        cables={cables}
        canEdit={canEdit}
        canDelete={canDelete}
        historyEntries={closureHistory}
        onAddNote={onAddNote}
        canAddNote={canEdit}
        onSave={onSaveSplice ?? (() => undefined)}
        onDelete={onDeleteSplice}
        onDeleteClosure={(payload) => {
          if (!canDelete) {
            toast.error("Your role cannot delete closures.");
            return;
          }
          const targetClosure = closures.find((closure) => closure.id === payload.closureId);
          setPendingDeletion({ type: "closure", id: payload.closureId, label: targetClosure?.name ?? payload.closureId });
        }}
        onOpenChange={(open) => {
          if (!open) {
            setModalType(null);
            setSelectedClosure(undefined);
            setSelectedCustomerNode(undefined);
            setSelectedClient(undefined);
          }
        }}
      />

      <ClientDropDetailsDrawer
        open={modalType === "customer-details"}
        node={selectedCustomerNode}
        customer={selectedCustomer}
        cables={cables}
        canDelete={canDelete}
        onReleaseConnection={(payload) => {
          if (!canDelete) {
            toast.error("Your role cannot remove client connections.");
            return;
          }
          onRemoveClient?.(payload);
        }}
        onOpenChange={(open) => {
          if (!open) {
            setModalType(null);
            setSelectedCustomerNode(undefined);
            setSelectedClient(undefined);
          }
        }}
      />

      <DeleteConfirmationModal
        open={Boolean(pendingDeletion)}
        objectType={
          pendingDeletion?.type === "cable"
            ? "fibre route"
            : pendingDeletion?.type === "closure"
              ? "closure"
              : pendingDeletion?.type === "facility"
                ? "facility"
                : "MST"
        }
        objectLabel={pendingDeletion?.label ?? ""}
        onOpenChange={(open) => {
          if (!open) setPendingDeletion(null);
        }}
        onConfirm={() => {
          if (!pendingDeletion) return;
          if (pendingDeletion.type === "mst") {
            onDeleteMst?.({ mstId: pendingDeletion.id });
            setModalType(null);
            setSelectedMST(undefined);
            setSelectedCustomerNode(undefined);
            setSelectedClient(undefined);
          } else if (pendingDeletion.type === "closure") {
            onDeleteClosure?.({ closureId: pendingDeletion.id });
            setModalType(null);
            setSelectedClosure(undefined);
            setSelectedCustomerNode(undefined);
            setSelectedClient(undefined);
          } else if (pendingDeletion.type === "facility") {
            onDeleteNode?.({ nodeId: pendingDeletion.id });
            setModalType(null);
            setSelectedOdf(undefined);
            setSelectedCabinet(undefined);
          } else {
            onDeleteCable?.({ cableId: pendingDeletion.id });
            setModalType(null);
            setSelectedFiber(undefined);
            setSelectedCustomerNode(undefined);
            setSelectedClient(undefined);
          }
          setPendingDeletion(null);
        }}
      />
    </div>
  );
}
