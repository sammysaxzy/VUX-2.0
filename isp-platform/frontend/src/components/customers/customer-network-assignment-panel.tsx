import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Map, { Marker } from "react-map-gl/mapbox";
import { CheckCircle2, Crosshair, MapPinned, Route, Save, Unplug } from "lucide-react";
import { toast } from "sonner";
import { getPreferredFibreRoute, calculatePolylineDistanceMeters, formatCableDistance } from "@/lib/fibre-routing";
import { resolveUserPermissions } from "@/lib/permissions";
import { formatDateOrDash, titleCase } from "@/lib/utils";
import { useSaveCustomer } from "@/hooks/api/use-customers";
import { useAssignClientToMstPort, useFibreCables, useNetworkNodes, useRemoveClientFromMstPort } from "@/hooks/api/use-network";
import { useAppStore } from "@/store/app-store";
import type { Customer, FibreCable, GeoPoint, NetworkNode } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type RoutePreference = "road" | "straight" | "manual";

type RoutePreview = {
  geometry: GeoPoint[];
  distanceMeters: number;
  routeMode: "road" | "straight";
  routeSource: "mapbox-directions" | "seeded" | "straight-line-fallback";
  routeFallbackReason?: string;
};

type MstRecommendation = {
  node: NetworkNode;
  distanceMeters: number | null;
  totalPorts: number;
  usedPorts: number;
  availablePorts: number;
  connectedClosure?: string;
  upstreamPath: string;
};

const PREVIEW_MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

function parseCoordinateValue(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseCombinedCoordinates(raw: string): GeoPoint | null {
  const matches = raw.match(/-?\d+(?:\.\d+)?/g);
  if (!matches || matches.length < 2) return null;
  const lat = Number(matches[0]);
  const lng = Number(matches[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function isValidCoordinate(point?: GeoPoint | null): point is GeoPoint {
  return Boolean(point && point.lat >= -90 && point.lat <= 90 && point.lng >= -180 && point.lng <= 180);
}

function parseManualRoutePoints(raw: string) {
  return raw
    .split(/\r?\n/)
    .map((line) => parseCombinedCoordinates(line))
    .filter((point): point is GeoPoint => isValidCoordinate(point));
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function calculateDistanceMeters(a: GeoPoint, b: GeoPoint) {
  const earthRadius = 6371000;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.min(1, Math.sqrt(h)));
}

function buildHistoryEvent(customer: Customer, title: string, description: string): Customer {
  const timestamp = new Date().toISOString();
  return {
    ...customer,
    history: [
      {
        id: `hist-${timestamp}`,
        title,
        description,
        createdAt: timestamp,
        type: "network",
      },
      ...(customer.history ?? []),
    ],
    notes: [
      {
        id: `note-${timestamp}`,
        author: "VUX CRM",
        message: description,
        createdAt: timestamp,
      },
      ...(customer.notes ?? []),
    ],
  };
}

function findConnectedNodeName(node: NetworkNode, nodes: NetworkNode[], cables: FibreCable[], targetType: NetworkNode["type"]) {
  const connectedNodeIds = cables
    .filter((cable) => cable.fromNodeId === node.id || cable.toNodeId === node.id)
    .flatMap((cable) => [cable.fromNodeId, cable.toNodeId])
    .filter((entry) => entry !== node.id);
  return nodes.find((entry) => connectedNodeIds.includes(entry.id) && entry.type === targetType)?.name;
}

function describeUpstreamPath(node: NetworkNode, nodes: NetworkNode[], cables: FibreCable[]) {
  const closure = findConnectedNodeName(node, nodes, cables, "closure");
  const cabinet = findConnectedNodeName(node, nodes, cables, "cabinet");
  const odf = findConnectedNodeName(node, nodes, cables, "odf");
  const pop = findConnectedNodeName(node, nodes, cables, "pop");
  return [pop, odf, cabinet, closure, node.name].filter(Boolean).join(" -> ");
}

function getAvailablePorts(mst?: NetworkNode, customerId?: string) {
  return (mst?.splitterPorts ?? []).filter((port) => port.status === "free" || port.customerId === customerId);
}

function getSelectableCores(cables: FibreCable[], mstId: string | undefined, customerId: string) {
  if (!mstId) return [];
  return cables
    .filter((cable) => cable.segmentType !== "drop" && (cable.fromNodeId === mstId || cable.toNodeId === mstId))
    .flatMap((cable) =>
      cable.cores
        .filter((core) => core.status !== "used" || core.assignedToCustomerId === customerId)
        .map((core) => ({
          cableId: cable.id,
          cableName: cable.name,
          coreId: core.id,
          coreLabel: core.label,
          fiberCore: core.label.split("-")[0] ?? core.label,
          status: core.status,
        })),
    );
}

async function resolveRoutePreview(
  routePreference: RoutePreference,
  mstLocation: GeoPoint,
  customerLocation: GeoPoint,
  manualRoutePoints: string,
) {
  if (routePreference === "manual") {
    const intermediatePoints = parseManualRoutePoints(manualRoutePoints);
    return {
      geometry: [mstLocation, ...intermediatePoints, customerLocation],
      distanceMeters: calculatePolylineDistanceMeters([mstLocation, ...intermediatePoints, customerLocation]),
      routeMode: "straight" as const,
      routeSource: "seeded" as const,
    };
  }
  if (routePreference === "straight") {
    return {
      geometry: [mstLocation, customerLocation],
      distanceMeters: calculateDistanceMeters(mstLocation, customerLocation),
      routeMode: "straight" as const,
      routeSource: "straight-line-fallback" as const,
    };
  }
  const route = await getPreferredFibreRoute(mstLocation, customerLocation);
  return {
    geometry: route.geometry,
    distanceMeters: route.distanceMeters,
    routeMode: route.routeMode,
    routeSource: route.routeSource,
    routeFallbackReason: route.routeFallbackReason,
  };
}

export function CustomerNetworkAssignmentPanel({ customer }: { customer: Customer }) {
  const { data: nodes = [] } = useNetworkNodes();
  const { data: cables = [] } = useFibreCables();
  const saveCustomer = useSaveCustomer();
  const assignClientToPort = useAssignClientToMstPort();
  const removeClientFromPort = useRemoveClientFromMstPort();
  const user = useAppStore((state) => state.user);
  const permissions = resolveUserPermissions(user);

  const [latitude, setLatitude] = useState(customer.location.lat.toString());
  const [longitude, setLongitude] = useState(customer.location.lng.toString());
  const [combinedCoordinates, setCombinedCoordinates] = useState("");
  const [gpsAccuracy, setGpsAccuracy] = useState<string>("");
  const [serviceAddress, setServiceAddress] = useState(customer.serviceLocation ?? customer.address ?? "");
  const [assignmentNotes, setAssignmentNotes] = useState("");
  const [mstSearch, setMstSearch] = useState("");
  const [selectedMstId, setSelectedMstId] = useState(customer.mstId ?? "");
  const [selectedPort, setSelectedPort] = useState(customer.splitterPort ? String(customer.splitterPort) : "");
  const [selectedCoreId, setSelectedCoreId] = useState(customer.fibreCoreId ?? "");
  const [routePreference, setRoutePreference] = useState<RoutePreference>("road");
  const [manualRoutePoints, setManualRoutePoints] = useState("");
  const [routePreview, setRoutePreview] = useState<RoutePreview | null>(null);
  const [isRouting, setIsRouting] = useState(false);

  useEffect(() => {
    setLatitude(customer.location.lat.toString());
    setLongitude(customer.location.lng.toString());
    setServiceAddress(customer.serviceLocation ?? customer.address ?? "");
    setSelectedMstId(customer.mstId ?? "");
    setSelectedPort(customer.splitterPort ? String(customer.splitterPort) : "");
    setSelectedCoreId(customer.fibreCoreId ?? "");
  }, [customer]);

  useEffect(() => {
    const storageKey = `vux:crm-location-pick:${customer.id}`;
    const stored = localStorage.getItem(storageKey);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as { lat?: number; lng?: number };
      if (typeof parsed.lat === "number" && typeof parsed.lng === "number") {
        setLatitude(parsed.lat.toFixed(6));
        setLongitude(parsed.lng.toFixed(6));
        toast.success("Customer coordinates loaded from the GIS map picker.");
      }
    } catch {
      toast.error("The saved GIS location pick could not be read.");
    } finally {
      localStorage.removeItem(storageKey);
    }
  }, [customer.id]);

  const canManageAssignment =
    Boolean(user) &&
    (permissions.settings_access ||
      permissions.inventory_access ||
      user?.role === "admin" ||
      user?.role === "manager" ||
      user?.role === "engineer" ||
      user?.role === "field_engineer" ||
      user?.role === "noc" ||
      user?.role === "noc_engineer");

  const resolvedCustomerLocation = useMemo(() => {
    const lat = parseCoordinateValue(latitude);
    const lng = parseCoordinateValue(longitude);
    if (lat === undefined || lng === undefined) return undefined;
    const point = { lat, lng };
    return isValidCoordinate(point) ? point : undefined;
  }, [latitude, longitude]);

  const mstRecommendations = useMemo<MstRecommendation[]>(() => {
    const customerPoint = resolvedCustomerLocation;
    return nodes
      .filter((node) => node.type === "mst")
      .map((node) => {
        const totalPorts = node.splitterPorts?.length ?? 0;
        const usedPorts = node.splitterPorts?.filter((port) => port.status === "used").length ?? 0;
        const availablePorts = Math.max(totalPorts - usedPorts, 0);
        return {
          node,
          distanceMeters: customerPoint ? calculateDistanceMeters(customerPoint, node.location) : null,
          totalPorts,
          usedPorts,
          availablePorts,
          connectedClosure: findConnectedNodeName(node, nodes, cables, "closure"),
          upstreamPath: describeUpstreamPath(node, nodes, cables),
        };
      })
      .filter((entry) => {
        const haystack = `${entry.node.name} ${entry.node.id} ${entry.connectedClosure ?? ""} ${entry.upstreamPath}`.toLowerCase();
        return mstSearch.trim() ? haystack.includes(mstSearch.trim().toLowerCase()) : true;
      })
      .sort((left, right) => {
        if (left.node.id === customer.mstId) return -1;
        if (right.node.id === customer.mstId) return 1;
        if (left.availablePorts !== right.availablePorts) return right.availablePorts - left.availablePorts;
        return (left.distanceMeters ?? Number.MAX_SAFE_INTEGER) - (right.distanceMeters ?? Number.MAX_SAFE_INTEGER);
      });
  }, [cables, customer.mstId, mstSearch, nodes, resolvedCustomerLocation]);

  const selectedMst = mstRecommendations.find((entry) => entry.node.id === selectedMstId)?.node;
  const availablePorts = useMemo(() => getAvailablePorts(selectedMst, customer.id), [selectedMst, customer.id]);
  const selectableCores = useMemo(() => getSelectableCores(cables, selectedMstId || customer.mstId, customer.id), [cables, customer.id, customer.mstId, selectedMstId]);
  const selectedCore = selectableCores.find((core) => core.coreId === selectedCoreId) ?? selectableCores[0];
  const selectedPortState = (selectedMst?.splitterPorts ?? []).find((port) => String(port.port) === selectedPort);
  const dropCable = cables.find((cable) => cable.id === customer.dropCableId);

  async function saveCustomerCoordinates(reason: string) {
    if (!resolvedCustomerLocation) {
      toast.error("Enter valid latitude and longitude values before saving.");
      return false;
    }
    const nextCustomer = buildHistoryEvent(
      {
        ...customer,
        location: resolvedCustomerLocation,
        serviceLocation: serviceAddress,
      },
      "Customer coordinates updated",
      `${reason}. Coordinates set to ${resolvedCustomerLocation.lat.toFixed(6)}, ${resolvedCustomerLocation.lng.toFixed(6)}.`,
    );
    await saveCustomer.mutateAsync(nextCustomer);
    return true;
  }

  async function buildRoutePreview() {
    if (!resolvedCustomerLocation) {
      toast.error("Add customer coordinates before generating a route preview.");
      return;
    }
    if (!selectedMst) {
      toast.error("Select an MST first.");
      return;
    }

    setIsRouting(true);
    try {
      const preview = await resolveRoutePreview(routePreference, selectedMst.location, resolvedCustomerLocation, manualRoutePoints);
      setRoutePreview(preview);
      return preview;
    } finally {
      setIsRouting(false);
    }
  }

  async function handleApplyCombinedCoordinates() {
    const parsed = parseCombinedCoordinates(combinedCoordinates);
    if (!isValidCoordinate(parsed)) {
      toast.error("Unable to parse a valid latitude/longitude pair from that entry.");
      return;
    }
    setLatitude(parsed.lat.toString());
    setLongitude(parsed.lng.toString());
    toast.success("Coordinates applied to the customer record form.");
  }

  function handleCaptureGps() {
    if (!navigator.geolocation) {
      toast.error("GPS capture is not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setGpsAccuracy(`${Math.round(position.coords.accuracy)} m`);
        toast.success("Current GPS position captured.");
      },
      (error) => {
        toast.error(error.message || "Unable to capture GPS location.");
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  async function handleSuggestFromAddress() {
    if (!serviceAddress.trim()) {
      toast.error("Add a service address first.");
      return;
    }
    const token = PREVIEW_MAPBOX_TOKEN;
    if (!token) {
      toast.error("Mapbox token is not configured for address suggestions.");
      return;
    }
    try {
      const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(serviceAddress)}.json?access_token=${encodeURIComponent(
        token,
      )}&limit=1`;
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error(`Geocoding failed with ${response.status}`);
      const payload = (await response.json()) as { features?: Array<{ center: [number, number] }> };
      const first = payload.features?.[0];
      if (!first) {
        toast.error("No coordinate suggestion was returned for that address.");
        return;
      }
      setLongitude(first.center[0].toFixed(6));
      setLatitude(first.center[1].toFixed(6));
      toast.success("Address suggestion applied.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Address suggestion failed.");
    }
  }

  async function handleAssign() {
    if (!canManageAssignment) {
      toast.error("Your role can view network assignments but cannot change them.");
      return;
    }
    if (!resolvedCustomerLocation) {
      toast.error("Valid customer coordinates are required before assignment.");
      return;
    }
    if (!selectedMst) {
      toast.error("Select an MST before assigning this customer.");
      return;
    }
    if (selectedMst.status === "fault") {
      toast.error("This MST is in a fault state and cannot take new assignments.");
      return;
    }
    if (!selectedPort) {
      toast.error("Choose an available MST port.");
      return;
    }
    if (selectedPortState?.status === "used" && selectedPortState.customerId !== customer.id) {
      toast.error("That port is already assigned to another customer.");
      return;
    }
    if (!selectedCore) {
      toast.error("Select an available upstream fibre core first.");
      return;
    }
    const activePreview = routePreview ?? (await buildRoutePreview());
    if (!activePreview) {
      toast.error("Generate a route preview before saving the assignment.");
      return;
    }

    const changingAssignment =
      Boolean(customer.mstId && customer.mstId !== selectedMst.id) ||
      Boolean(customer.splitterPort && String(customer.splitterPort) !== selectedPort);

    if (
      changingAssignment &&
      !window.confirm(
        `Move ${customer.name} from ${customer.mstId ?? "no MST"} / port ${customer.splitterPort ?? "-"} to ${selectedMst.name} / port ${selectedPort}?`,
      )
    ) {
      return;
    }

    const coordinatesSaved = await saveCustomerCoordinates("CRM network assignment preparation");
    if (!coordinatesSaved) return;

    await assignClientToPort.mutateAsync({
      mstId: selectedMst.id,
      portNumber: Number(selectedPort),
      clientId: customer.id,
      clientName: customer.name,
      clientLocation: resolvedCustomerLocation,
      fiberCore: selectedCore.fiberCore,
      cableId: selectedCore.cableId,
      coreId: selectedCore.coreId,
      coreLabel: selectedCore.coreLabel,
      geometry: activePreview.geometry,
      routeMode: activePreview.routeMode,
      routeSource: activePreview.routeSource,
      routeFallbackReason: activePreview.routeFallbackReason,
    });

    await saveCustomer.mutateAsync(
      buildHistoryEvent(
        {
          ...customer,
          location: resolvedCustomerLocation,
          serviceLocation: serviceAddress,
          mstId: selectedMst.id,
          splitterPort: Number(selectedPort),
          fibreCoreId: selectedCore.coreId,
        },
        changingAssignment ? "Customer reassigned to MST" : "Customer assigned to MST",
        `${customer.name} linked to ${selectedMst.name} on port ${selectedPort}. ${assignmentNotes.trim() || "Assignment completed from CRM."}`,
      ),
    );
  }

  async function handleReleasePort() {
    if (!customer.mstId || !customer.splitterPort) {
      toast.error("This customer is not currently assigned to an MST port.");
      return;
    }
    if (!canManageAssignment) {
      toast.error("Your role cannot release network assignments.");
      return;
    }
    if (!window.confirm(`Release ${customer.name} from ${customer.mstId} port ${customer.splitterPort}?`)) {
      return;
    }
    await removeClientFromPort.mutateAsync({ mstId: customer.mstId, portNumber: customer.splitterPort });
    await saveCustomer.mutateAsync(
      buildHistoryEvent(
        {
          ...customer,
          mstId: undefined,
          splitterPort: undefined,
          fibreCoreId: undefined,
          dropCableId: undefined,
        },
        "Customer port released",
        `${customer.name} was released from ${customer.mstId} port ${customer.splitterPort}. ${assignmentNotes.trim() || "Release initiated from CRM."}`,
      ),
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <CardTitle>Network Assignment</CardTitle>
          <p className="text-sm text-muted-foreground">
            Keep CRM and GIS in sync by managing coordinates, MST selection, splitter ports, and route preview from one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={customer.mstId ? "success" : "warning"}>{customer.mstId ? "Mapped to network" : "Needs assignment"}</Badge>
          <Badge variant={canManageAssignment ? "outline" : "warning"}>{canManageAssignment ? "Editable" : "View only"}</Badge>
          <Link to={`/map?customer=${customer.id}`}>
            <Button variant="outline" size="sm">
              <MapPinned className="mr-1 h-4 w-4" />
              View on Map
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <section className="rounded-2xl border border-border/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">1. Customer Coordinates</p>
                  <p className="text-xs text-muted-foreground">Manual entry, combined coordinates, GPS capture, address suggestion, and draggable preview marker.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => void saveCustomerCoordinates("CRM coordinate update")} disabled={saveCustomer.isPending || !canManageAssignment}>
                  <Save className="mr-1 h-4 w-4" />
                  Save Coordinates
                </Button>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span>Latitude</span>
                  <Input value={latitude} onChange={(event) => setLatitude(event.target.value)} placeholder="6.524379" />
                </label>
                <label className="space-y-1 text-sm">
                  <span>Longitude</span>
                  <Input value={longitude} onChange={(event) => setLongitude(event.target.value)} placeholder="3.379206" />
                </label>
                <label className="space-y-1 text-sm md:col-span-2">
                  <span>Paste combined coordinates</span>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input value={combinedCoordinates} onChange={(event) => setCombinedCoordinates(event.target.value)} placeholder="6.524379, 3.379206" />
                    <Button type="button" variant="outline" onClick={() => void handleApplyCombinedCoordinates()}>
                      Apply
                    </Button>
                  </div>
                </label>
                <label className="space-y-1 text-sm md:col-span-2">
                  <span>Service address / area</span>
                  <Input value={serviceAddress} onChange={(event) => setServiceAddress(event.target.value)} placeholder="Omole Phase 2, Ikeja" />
                </label>
                <div className="flex flex-wrap gap-2 md:col-span-2">
                  <Button type="button" variant="outline" onClick={handleCaptureGps} disabled={!canManageAssignment}>
                    <Crosshair className="mr-1 h-4 w-4" />
                    Capture GPS
                  </Button>
                  <Button type="button" variant="outline" onClick={() => void handleSuggestFromAddress()}>
                    Suggest From Address
                  </Button>
                  <Link to={`/map?customer=${customer.id}`}>
                    <Button type="button" variant="outline">
                      Open in Map Picker
                    </Button>
                  </Link>
                  <Link to={`/map?customer=${customer.id}&pickCustomerLocation=1&returnTo=${encodeURIComponent(`/customers/${customer.id}`)}`}>
                    <Button type="button" variant="outline">
                      Pick on Map
                    </Button>
                  </Link>
                </div>
                <div className="md:col-span-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>GPS accuracy: {gpsAccuracy || "Not captured"}</span>
                  <span>Install status: {titleCase(customer.installStatus ?? "pending")}</span>
                  <span>Optical power: RX {customer.rxSignal} dBm</span>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-border/70 p-4">
              <p className="text-sm font-semibold">2. Find and Select MST</p>
              <p className="mt-1 text-xs text-muted-foreground">Search MSTs by name or connected path and review distance, capacity, closure, and upstream context.</p>
              <Input className="mt-3" value={mstSearch} onChange={(event) => setMstSearch(event.target.value)} placeholder="Search MST, closure, path, or estate" />
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {mstRecommendations.slice(0, 6).map((entry) => {
                  const capacityPercentage = entry.totalPorts ? Math.round((entry.usedPorts / entry.totalPorts) * 100) : 0;
                  const recommended =
                    entry.availablePorts > 0 &&
                    entry.node.status === "healthy" &&
                    entry.distanceMeters !== null &&
                    entry.distanceMeters < 250;
                  return (
                    <button
                      key={entry.node.id}
                      type="button"
                      onClick={() => setSelectedMstId(entry.node.id)}
                      className={`rounded-2xl border p-3 text-left transition ${
                        selectedMstId === entry.node.id ? "border-primary bg-primary/5" : "border-border/70 hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{entry.node.name}</p>
                          <p className="text-xs text-muted-foreground">{entry.node.id}</p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {recommended ? <Badge variant="success">Recommended</Badge> : null}
                          <Badge variant={entry.node.status === "fault" ? "danger" : entry.node.status === "warning" ? "warning" : "outline"}>
                            {titleCase(entry.node.status)}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        <p>Distance: {entry.distanceMeters !== null ? formatCableDistance(entry.distanceMeters) : "Add coordinates to calculate"}</p>
                        <p>Ports: {entry.usedPorts}/{entry.totalPorts} used • {entry.availablePorts} available</p>
                        <p>Capacity: {capacityPercentage}%</p>
                        <p>Closure: {entry.connectedClosure ?? "Not mapped yet"}</p>
                        <p>Coordinates: {entry.node.location.lat.toFixed(5)}, {entry.node.location.lng.toFixed(5)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              {!mstRecommendations.length ? <p className="mt-3 text-sm text-muted-foreground">No MST matches the current search.</p> : null}
            </section>

            <section className="rounded-2xl border border-border/70 p-4">
              <p className="text-sm font-semibold">3. Splitter Port and Fibre Path</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span>Selected MST</span>
                  <Input value={selectedMst?.name ?? "No MST selected"} disabled />
                </label>
                <label className="space-y-1 text-sm">
                  <span>Splitter type</span>
                  <Input value={selectedMst?.splitterType ?? "Not configured"} disabled />
                </label>
                <label className="space-y-1 text-sm">
                  <span>Available port</span>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={selectedPort}
                    onChange={(event) => setSelectedPort(event.target.value)}
                    disabled={!canManageAssignment}
                  >
                    <option value="">Select port</option>
                    {availablePorts.map((port) => (
                      <option key={port.port} value={port.port}>
                        Port {port.port} {port.customerId === customer.id ? "(Current)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span>Upstream fibre core</span>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={selectedCoreId}
                    onChange={(event) => setSelectedCoreId(event.target.value)}
                    disabled={!canManageAssignment}
                  >
                    <option value="">Select core</option>
                    {selectableCores.map((core) => (
                      <option key={core.coreId} value={core.coreId}>
                        {core.cableName} • {core.coreLabel} • {core.status}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>Reserved ports: backend port-state model pending</span>
                <span>Faulty ports: backend port-state model pending</span>
                <span>Connected path: {selectedMst ? describeUpstreamPath(selectedMst, nodes, cables) : "Select MST"}</span>
              </div>
            </section>

            <section className="rounded-2xl border border-border/70 p-4">
              <p className="text-sm font-semibold">4. Route Mode and Preview</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {([
                  ["road", "Road-following"],
                  ["straight", "Direct line"],
                  ["manual", "Manual points"],
                ] as const).map(([value, label]) => (
                  <Button key={value} type="button" size="sm" variant={routePreference === value ? "default" : "outline"} onClick={() => setRoutePreference(value)}>
                    {label}
                  </Button>
                ))}
                <Button type="button" size="sm" variant="outline" onClick={() => void buildRoutePreview()} disabled={isRouting}>
                  <Route className="mr-1 h-4 w-4" />
                  {isRouting ? "Generating..." : "Preview Route"}
                </Button>
              </div>
              {routePreference === "manual" ? (
                <label className="mt-3 block space-y-1 text-sm">
                  <span>Intermediate coordinates, one per line</span>
                  <Textarea
                    value={manualRoutePoints}
                    onChange={(event) => setManualRoutePoints(event.target.value)}
                    placeholder={"6.601100, 3.351200\n6.601450, 3.351980"}
                    rows={4}
                  />
                </label>
              ) : null}
              <div className="mt-3 rounded-2xl border border-dashed border-border/70 p-3 text-sm">
                {routePreview ? (
                  <div className="space-y-1">
                    <p className="font-medium">Route preview ready</p>
                    <p className="text-muted-foreground">
                      {formatCableDistance(routePreview.distanceMeters)} • {routePreview.routeMode} • {routePreview.routeSource}
                    </p>
                    {routePreview.routeFallbackReason ? <p className="text-xs text-warning">{routePreview.routeFallbackReason}</p> : null}
                    <p className="text-xs text-muted-foreground">
                      {routePreference === "manual" ? "Manual geometry will be saved as a seeded route." : "The route will sync into the GIS drop-cable layer after assignment."}
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No route preview generated yet.</p>
                )}
              </div>
            </section>
          </div>

          <div className="space-y-4">
            <section className="rounded-2xl border border-border/70 p-4">
              <p className="text-sm font-semibold">Assignment Snapshot</p>
              <div className="mt-3 grid gap-3 text-sm">
                <div className="rounded-2xl border border-border/60 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Current network path</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{customer.oltName || "OLT pending"}</Badge>
                    <Badge variant="outline">{customer.ponPort || "PON pending"}</Badge>
                    <Badge variant="outline">{customer.mstId ?? "MST pending"}</Badge>
                    <Badge variant="outline">Port {customer.splitterPort ?? "-"}</Badge>
                    <Badge variant="outline">{customer.dropCableId ?? "Drop pending"}</Badge>
                    <Badge variant="outline">{customer.id}</Badge>
                  </div>
                </div>
                <div className="rounded-2xl border border-border/60 p-3">
                  <p><span className="text-muted-foreground">Assigned technician:</span> {customer.assignedEngineer ?? "Unassigned"}</p>
                  <p><span className="text-muted-foreground">Installation date:</span> {formatDateOrDash(customer.installDate)}</p>
                  <p><span className="text-muted-foreground">Drop cable:</span> {dropCable?.name ?? "Not generated yet"}</p>
                  <p><span className="text-muted-foreground">Drop length:</span> {dropCable ? formatCableDistance(dropCable.distanceMeters) : routePreview ? formatCableDistance(routePreview.distanceMeters) : "-"}</p>
                  <p><span className="text-muted-foreground">Optical power:</span> RX {customer.rxSignal} dBm / TX {customer.txSignal} dBm</p>
                </div>
                <label className="space-y-1">
                  <span className="text-sm">Assignment notes / reason</span>
                  <Textarea
                    value={assignmentNotes}
                    onChange={(event) => setAssignmentNotes(event.target.value)}
                    placeholder="Why this MST was selected, route notes, survey comments, or reassignment reason."
                    rows={4}
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => void handleAssign()} disabled={!canManageAssignment || assignClientToPort.isPending || saveCustomer.isPending}>
                    <CheckCircle2 className="mr-1 h-4 w-4" />
                    {customer.mstId ? "Save Network Changes" : "Assign to MST"}
                  </Button>
                  <Button variant="outline" onClick={() => void buildRoutePreview()} disabled={isRouting}>
                    Refresh Preview
                  </Button>
                  <Button variant="danger" onClick={() => void handleReleasePort()} disabled={!customer.mstId || !customer.splitterPort || removeClientFromPort.isPending || !canManageAssignment}>
                    <Unplug className="mr-1 h-4 w-4" />
                    Release Port
                  </Button>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-border/70 p-4">
              <p className="text-sm font-semibold">Location Preview</p>
              <div className="mt-3 overflow-hidden rounded-2xl border border-border/60">
                {resolvedCustomerLocation && PREVIEW_MAPBOX_TOKEN ? (
                  <Map
                    mapboxAccessToken={PREVIEW_MAPBOX_TOKEN}
                    initialViewState={{
                      longitude: resolvedCustomerLocation.lng,
                      latitude: resolvedCustomerLocation.lat,
                      zoom: 15.5,
                    }}
                    longitude={resolvedCustomerLocation.lng}
                    latitude={resolvedCustomerLocation.lat}
                    zoom={15.5}
                    style={{ width: "100%", height: 260 }}
                    mapStyle="mapbox://styles/mapbox/light-v11"
                  >
                    {selectedMst ? (
                      <Marker longitude={selectedMst.location.lng} latitude={selectedMst.location.lat} color="#1D4ED8" />
                    ) : null}
                    <Marker
                      longitude={resolvedCustomerLocation.lng}
                      latitude={resolvedCustomerLocation.lat}
                      color="#EA580C"
                      draggable={canManageAssignment}
                      onDragEnd={(event) => {
                        setLatitude(event.lngLat.lat.toFixed(6));
                        setLongitude(event.lngLat.lng.toFixed(6));
                      }}
                    />
                  </Map>
                ) : (
                  <div className="flex h-[260px] items-center justify-center bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                    {resolvedCustomerLocation ? "Add a Mapbox token to enable the live mini-map preview." : "Enter valid coordinates to preview the customer position."}
                  </div>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Drag the orange marker to correct the customer position. Use the blue marker to verify the selected MST.
              </p>
            </section>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
