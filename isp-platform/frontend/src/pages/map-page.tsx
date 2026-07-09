import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MapPinned } from "lucide-react";
import { toast } from "sonner";
import { FIBRE_CORE_PALETTE } from "@/constants/fibre";
import { useCustomers } from "@/hooks/api/use-customers";
import { useFaults, useReportFault } from "@/hooks/api/use-faults";
import {
  useAssignClientToMstPort,
  useAssignCoreToCable,
  useDeleteClosure,
  useDeleteFibreCable,
  useDeleteNetworkNode,
  useClosures,
  useCreateMstConnection,
  useDeleteClosureSplice,
  useRemoveClientFromMstPort,
  useSetCableCoreState,
  useUpdateMstSplitterType,
  useFibreCables,
  useNetworkNodes,
  useUpsertClosureSplice,
} from "@/hooks/api/use-network";
import { usePermissionRoles } from "@/hooks/api/use-settings";
import { getFaultImpact } from "@/lib/isp";
import type { ClosureBox, Customer, FibreCable, FibreCoreCount, Fault, NetworkNode } from "@/types";
import { MapComponent } from "@/components/map/map-component";
import { NetworkGisWorkbench } from "@/components/map/network-gis-workbench";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { calculatePolylineDistanceMeters, formatCableDistance, getPreferredFibreRoute, hydrateCableRoute } from "@/lib/fibre-routing";
import { resolveMapAccess } from "@/lib/map-permissions";
import { cn } from "@/lib/utils";
import { randomId } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

export function MapPage() {
  const [searchParams] = useSearchParams();
  const currentUser = useAppStore((state) => state.user);
  const selectedFiberId = useAppStore((state) => state.selectedFiberId);
  const selectedClientId = useAppStore((state) => state.selectedClientId);
  const { data: nodes, isLoading: nodesLoading } = useNetworkNodes();
  const { data: cables, isLoading: cableLoading } = useFibreCables();
  const { data: closures, isLoading: closureLoading } = useClosures();
  const { data: customers, isLoading: customerLoading } = useCustomers();
  const { data: permissionRoles } = usePermissionRoles();
  const { data: faults } = useFaults();
  const reportFault = useReportFault();
  const createMstConnection = useCreateMstConnection();
  const assignCore = useAssignCoreToCable();
  const assignClientToPort = useAssignClientToMstPort();
  const upsertSplice = useUpsertClosureSplice();
  const deleteSplice = useDeleteClosureSplice();
  const setCableCoreState = useSetCableCoreState();
  const removeClientFromPort = useRemoveClientFromMstPort();
  const updateSplitterType = useUpdateMstSplitterType();
  const deleteFibreCable = useDeleteFibreCable();
  const deleteNetworkNode = useDeleteNetworkNode();
  const deleteClosure = useDeleteClosure();
  const [localNodes, setLocalNodes] = useState<NetworkNode[]>([]);
  const [localCables, setLocalCables] = useState<FibreCable[]>([]);
  const [localClosures, setLocalClosures] = useState<ClosureBox[]>([]);
  const [localCustomers, setLocalCustomers] = useState<Customer[]>([]);
  const [workHistory, setWorkHistory] = useState<Array<{ id: string; nodeId?: string; message: string; timestamp: string }>>([]);
  const [activeMapCard, setActiveMapCard] = useState<"nodes" | "routes" | "closures" | "outages" | "customers" | null>(null);
  const workbenchRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapAccess = useMemo(() => resolveMapAccess(currentUser, permissionRoles ?? []), [currentUser, permissionRoles]);

  const logWork = (message: string, nodeId?: string) => {
    setWorkHistory((prev) => [
      {
        id: randomId("log"),
        nodeId,
        message,
        timestamp: new Date().toLocaleString(),
      },
      ...prev,
    ].slice(0, 50));
  };

  const logCableFlow = (cable: FibreCable) => {
    const fromLabel = localNodes.find((node) => node.id === cable.fromNodeId)?.name ?? cable.fromNodeId;
    const toLabel = localNodes.find((node) => node.id === cable.toNodeId)?.name ?? cable.toNodeId;
    logWork(`${cable.coreCount}-core added from ${fromLabel}`, cable.toNodeId);
    logWork(`${cable.coreCount}-core sent to ${toLabel}`, cable.fromNodeId);
  };

  const addNodeNote = (nodeId: string, note: string) => {
    logWork(`Field note: ${note}`, nodeId);
  };

  const focusSection = (
    target: "workbench" | "map",
    card: "nodes" | "routes" | "closures" | "outages" | "customers",
    message: string,
  ) => {
    setActiveMapCard(card);
    const section = target === "workbench" ? workbenchRef.current : mapRef.current;
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
    toast.info(message);
  };

  useEffect(() => {
    if (nodes) setLocalNodes(nodes);
  }, [nodes]);
  useEffect(() => {
    if (cables) setLocalCables(cables);
  }, [cables]);
  useEffect(() => {
    if (closures) setLocalClosures(closures);
  }, [closures]);
  useEffect(() => {
    if (customers) setLocalCustomers(customers);
  }, [customers]);

  const highlightedCableId = useMemo(
    () => faults?.find((fault) => fault.status !== "resolved")?.affectedCableId,
    [faults],
  );

  const focusCustomerId = searchParams.get("customer") ?? undefined;
  const activeFaults = faults?.filter((fault) => fault.status !== "resolved") ?? [];
  const affectedCustomerCount = activeFaults.reduce((sum, fault) => sum + getFaultImpact(fault, localCustomers).length, 0);

  const activeFaultCableIds = useMemo(() => {
    if (!faults) return new Set<string>();
    return new Set(
      faults
        .filter((fault) => fault.status !== "resolved")
        .map((fault) => fault.affectedCableId)
        .filter((id): id is string => Boolean(id)),
    );
  }, [faults]);

  useEffect(() => {
    if (!faults || localCables.length === 0) return;
    setLocalCables((prev) =>
      prev.map((cable) => ({
        ...cable,
        faulted: activeFaultCableIds.has(cable.id),
      })),
    );
  }, [activeFaultCableIds, faults, localCables.length]);

  const buildFreshCores = (coreCount: FibreCoreCount): FibreCable["cores"] =>
    Array.from({ length: coreCount }, (_, index) => {
      const color = FIBRE_CORE_PALETTE[index % FIBRE_CORE_PALETTE.length];
      return {
        id: randomId("core"),
        index: index + 1,
        label: `${color.label}-${index + 1}`,
        color: color.hex,
        status: "free",
      };
    });

  const buildDropCableLocally = (payload: {
    id: string;
    mstId: string;
    clientId: string;
    clientName: string;
    splitterPort: number;
    geometry: FibreCable["coordinates"];
    coreId: string;
    coreLabel: string;
    fiberCore: string;
    routeMode: NonNullable<FibreCable["routeMode"]>;
    routeSource: NonNullable<FibreCable["routeSource"]>;
    routeFallbackReason?: string;
  }): FibreCable => {
    const mstNode = localNodes.find((node) => node.id === payload.mstId);
    const customer = localCustomers.find((entry) => entry.id === payload.clientId);
    const usedColor =
      FIBRE_CORE_PALETTE.find((entry) => entry.label.toLowerCase() === payload.fiberCore.toLowerCase())?.hex ??
      payload.fiberCore;

    return hydrateCableRoute({
      id: payload.id,
      name: `${mstNode?.name ?? payload.mstId} -> ${payload.clientName}`,
      segmentType: "drop",
      coreCount: 2,
      fromNodeId: payload.mstId,
      toNodeId: payload.clientId,
      startMstId: payload.mstId,
      endMstId: payload.clientId,
      start: mstNode?.location ?? payload.geometry[0],
      end: customer?.location ?? payload.geometry[payload.geometry.length - 1],
      geometry: payload.geometry,
      coordinates: payload.geometry,
      distanceMeters: 0,
      routeMode: payload.routeMode,
      routeSource: payload.routeSource,
      routeFallbackReason: payload.routeFallbackReason,
      clientId: payload.clientId,
      splitterPort: payload.splitterPort,
      assignedCoreId: payload.coreId,
      coreUsed: payload.coreLabel,
      faulted: false,
      cores: [
        {
          id: `${payload.coreId}-drop-active`,
          index: 1,
          label: payload.coreLabel,
          color: usedColor,
          status: "used",
          fromMstId: payload.mstId,
          toMstId: payload.clientId,
          usagePath: `${payload.coreLabel} core is assigned from ${payload.mstId} to ${payload.clientName} on splitter port ${payload.splitterPort}`,
          assignedToCustomerId: payload.clientId,
        },
        {
          id: `${payload.coreId}-drop-spare`,
          index: 2,
          label: "Spare-2",
          color: FIBRE_CORE_PALETTE[1]?.hex ?? "#CBD5E1",
          status: "free",
        },
      ],
      splices: [],
    });
  };

  const updateCableCoreLocally = (cableId: string, nextCore: FibreCable["cores"][number]) => {
    setLocalCables((prev) =>
      prev.map((cable) =>
        cable.id !== cableId
          ? cable
          : {
              ...cable,
              cores: cable.cores.map((core) => (core.id === nextCore.id ? nextCore : core)),
            },
      ),
    );
  };

  const upsertCustomerNodeLocally = (customer: Customer) => {
    setLocalNodes((prev) => {
      const node: NetworkNode = {
        id: customer.id,
        tenantId: customer.tenantId,
        type: "customer",
        name: customer.name,
        location: customer.location,
        status: customer.accountStatus === "suspended" ? "warning" : customer.online ? "healthy" : "warning",
      };
      const existingIndex = prev.findIndex((entry) => entry.type === "customer" && entry.id === customer.id);
      if (existingIndex === -1) return [node, ...prev];
      const next = [...prev];
      next[existingIndex] = { ...next[existingIndex], ...node };
      return next;
    });
  };

  const upsertNodeLocally = (node: NetworkNode) => {
    setLocalNodes((prev) => {
      const index = prev.findIndex((entry) => entry.id === node.id);
      if (index === -1) return [node, ...prev];
      const next = [...prev];
      next[index] = node;
      return next;
    });
  };

  const upsertCableLocally = (cable: FibreCable) => {
    setLocalCables((prev) => {
      const index = prev.findIndex((entry) => entry.id === cable.id);
      if (index === -1) return [cable, ...prev];
      const next = [...prev];
      next[index] = cable;
      return next;
    });
  };

  const clearClientConnectionLocally = (customerId: string) => {
    setLocalCustomers((prev) =>
      prev.map((customer) =>
        customer.id === customerId
          ? {
              ...customer,
              mstId: undefined,
              splitterPort: undefined,
              fibreCoreId: undefined,
              dropCableId: undefined,
            }
          : customer,
      ),
    );
    setLocalNodes((prev) =>
      prev.map((node) =>
        node.type !== "mst"
          ? node
          : {
              ...node,
              splitterPorts: node.splitterPorts?.map((port) =>
                port.customerId === customerId
                  ? {
                      ...port,
                      status: "free",
                      customerId: undefined,
                      customerName: undefined,
                      assignedCoreColor: undefined,
                    }
                  : port,
              ),
              clients: (node.clients ?? []).filter((client) => client.id !== customerId),
            },
      ),
    );
    setLocalCables((prev) =>
      prev
        .filter((cable) => !(cable.segmentType === "drop" && cable.clientId === customerId))
        .map((cable) => ({
          ...cable,
          cores: cable.cores.map((core) =>
            core.assignedToCustomerId === customerId
              ? {
                  ...core,
                  status: "free",
                  fromMstId: undefined,
                  toMstId: undefined,
                  usagePath: undefined,
                  assignedToCustomerId: undefined,
                }
              : core,
          ),
        })),
    );
  };

  const announceRouteResult = (cable: FibreCable) => {
    const message = `${cable.name} | ${formatCableDistance(cable.distanceMeters)}`;
    if (cable.routeSource === "seeded") {
      toast.success(`Custom fibre route saved. ${message}`);
      return;
    }
    if (cable.routeMode === "road") {
      toast.success(`Road-following fibre route ready. ${message}`);
      return;
    }
    toast.warning(`Directions unavailable, straight-line fallback used. ${message}`);
  };

  const validateDraftRoute = (payload: {
    start: { lat: number; lng: number };
    end: { lat: number; lng: number };
    geometry?: Array<{ lat: number; lng: number }>;
    startAssetType?: string;
    endAssetType?: string;
  }) => {
    const geometry = payload.geometry?.length ? payload.geometry : [payload.start, payload.end];
    if (geometry.length < 2) return "Route must contain at least two points.";
    if ((payload.startAssetType === "closure" || payload.endAssetType === "closure") && geometry.length < 2) {
      return "A closure route needs a valid connected geometry.";
    }
    const totalDistance = calculatePolylineDistanceMeters(geometry);
    if (totalDistance < 5) return "Route distance is too short to publish.";
    const impossibleBend = geometry.slice(1, -1).some((point, index) => {
      const previous = geometry[index];
      const next = geometry[index + 2];
      const segmentA = calculatePolylineDistanceMeters([previous, point]);
      const segmentB = calculatePolylineDistanceMeters([point, next]);
      return segmentA > 0 && segmentB > 0 && (segmentA < 2 || segmentB < 2);
    });
    if (impossibleBend) return "Route contains an impossible bend or collapsed segment.";
    return null;
  };

  const detachCablesFromClosures = (removedCableIds: string[]) => {
    if (removedCableIds.length === 0) return;
    setLocalClosures((prev) =>
      prev.map((closure) => ({
        ...closure,
        connectedCableIds: closure.connectedCableIds.filter((id) => !removedCableIds.includes(id)),
        splices: closure.splices.filter(
          (splice) => !removedCableIds.includes(splice.fromCableId) && !removedCableIds.includes(splice.toCableId),
        ),
      })),
    );
  };

  const buildFaultPayload = (cable: FibreCable): Omit<Fault, "id" | "tenantId" | "createdAt"> => {
    const route = cable.geometry?.length ? cable.geometry : cable.coordinates;
    const faultPoint = route[Math.floor(route.length / 2)] ?? route[0] ?? { lat: 6.444, lng: 3.482 };
    const usedCore = cable.cores.find((core) => core.status === "used");
    const coreLabel = usedCore?.label ?? cable.cores[0]?.label ?? "Core";
    return {
      title: "Fibre Cut Detected",
      description: `${coreLabel} cut detected on ${cable.name}.`,
      severity: "critical",
      status: "open",
      location: faultPoint,
      affectedCableId: cable.id,
      affectedNodeId: cable.toNodeId,
    };
  };

  if (nodesLoading || cableLoading || closureLoading || customerLoading || !cables || !closures || !customers) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Interactive Fibre GIS</h1>
          <p className="text-sm text-muted-foreground">
            Enterprise mapping workspace for planning, topology, outage impact, route design, and field operations.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <MapPinned className="h-3.5 w-3.5" />
            <span>{localNodes.length} nodes</span>
            <span>Role: {mapAccess.mapRole.toUpperCase()}</span>
            <span>{mapAccess.canDelete ? "Delete Enabled" : "Delete Restricted"}</span>
          </div>
          <span>{faults?.length ?? 0} faults</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card
          role="button"
          tabIndex={0}
          onClick={() => focusSection("map", "nodes", "Jumped to the live network map for node review.")}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              focusSection("map", "nodes", "Jumped to the live network map for node review.");
            }
          }}
          className={cn(
            "cursor-pointer transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
            activeMapCard === "nodes" && "border-primary/70 ring-2 ring-primary/20",
          )}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Network Nodes</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{localNodes.length}</CardContent>
        </Card>
        <Card
          role="button"
          tabIndex={0}
          onClick={() => focusSection("map", "routes", "Jumped to the map to inspect fibre routes.")}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              focusSection("map", "routes", "Jumped to the map to inspect fibre routes.");
            }
          }}
          className={cn(
            "cursor-pointer transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
            activeMapCard === "routes" && "border-primary/70 ring-2 ring-primary/20",
          )}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Fibre Routes</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{localCables.length}</CardContent>
        </Card>
        <Card
          role="button"
          tabIndex={0}
          onClick={() => focusSection("map", "closures", "Jumped to the map to inspect closures and splice points.")}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              focusSection("map", "closures", "Jumped to the map to inspect closures and splice points.");
            }
          }}
          className={cn(
            "cursor-pointer transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
            activeMapCard === "closures" && "border-primary/70 ring-2 ring-primary/20",
          )}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Closures</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{localClosures.length}</CardContent>
        </Card>
        <Card
          role="button"
          tabIndex={0}
          onClick={() => focusSection("workbench", "outages", "Opened outage and impact analysis cards below.")}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              focusSection("workbench", "outages", "Opened outage and impact analysis cards below.");
            }
          }}
          className={cn(
            "cursor-pointer transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
            activeMapCard === "outages" && "border-primary/70 ring-2 ring-primary/20",
          )}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Open Outages</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-danger">{activeFaults.length}</CardContent>
        </Card>
        <Card
          role="button"
          tabIndex={0}
          onClick={() => focusSection("workbench", "customers", "Opened customer impact and service path views below.")}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              focusSection("workbench", "customers", "Opened customer impact and service path views below.");
            }
          }}
          className={cn(
            "cursor-pointer transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
            activeMapCard === "customers" && "border-primary/70 ring-2 ring-primary/20",
          )}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Affected Customers</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-warning">{affectedCustomerCount}</CardContent>
        </Card>
      </div>

      <div ref={workbenchRef}>
        <NetworkGisWorkbench
          nodes={localNodes}
          cables={localCables}
          customers={localCustomers}
          faults={faults ?? []}
          selectedCable={localCables.find((cable) => cable.id === selectedFiberId)}
          selectedCustomer={localCustomers.find((customer) => customer.id === selectedClientId)}
        />
      </div>

      <div ref={mapRef}>
        <MapComponent
          nodes={localNodes}
          cables={localCables}
          closures={localClosures}
          customers={localCustomers}
          focusCustomerId={focusCustomerId}
          faults={faults ?? []}
          highlightedCableId={highlightedCableId}
          onInfrastructureAdded={(node) => {
          setLocalNodes((prev) => [node, ...prev]);
          if (node.type === "closure") {
            setLocalClosures((prev) => [
              {
                id: node.id,
                name: node.name,
                location: node.location,
                connectedCableIds: [],
                splices: [],
              },
              ...prev,
            ]);
          }
          logWork(`${node.type.toUpperCase()} added at ${node.location.lat.toFixed(5)}, ${node.location.lng.toFixed(5)}`, node.id);
        }}
        onUpdateNode={(updatedNode) => {
          setLocalNodes((prev) => prev.map((node) => (node.id === updatedNode.id ? updatedNode : node)));
          logWork(`${updatedNode.type.toUpperCase()} updated`, updatedNode.id);
        }}
        onUpdateClosure={(updatedClosure) => {
          setLocalClosures((prev) => prev.map((closure) => (closure.id === updatedClosure.id ? updatedClosure : closure)));
          logWork(`CLOSURE updated`, updatedClosure.id);
        }}
        onSeedFault={() => {
          const targetCable =
            localCables.find((cable) => cable.cores.some((core) => core.status === "used")) ?? localCables[0];
          if (!targetCable) {
            toast.error("Seed failed: create a fibre cable first.");
            return;
          }
          reportFault.mutate(buildFaultPayload(targetCable));
        }}
        onCreateFiber={async ({
          name,
          cableType,
          owner,
          geometry,
          routeStatus,
          routeType,
          installationMethod,
          installDate,
          depthMeters,
          heightMeters,
          notes,
          start,
          end,
          coreCount,
          startNodeId,
          endNodeId,
          startAssetType,
          startAssetName,
          endAssetType,
          endAssetName,
          creationMode,
        }) => {
          const validationError = validateDraftRoute({
            start,
            end,
            geometry,
            startAssetType,
            endAssetType,
          });
          if (validationError) {
            toast.error(validationError);
            return;
          }

          const directGeometry = geometry?.length && geometry.length >= 2 ? geometry : undefined;
          const route = directGeometry
            ? {
                start: directGeometry[0],
                end: directGeometry[directGeometry.length - 1],
                geometry: directGeometry,
                distanceMeters: calculatePolylineDistanceMeters(directGeometry),
                routeMode: "straight" as const,
                routeSource: "seeded" as const,
                routeFallbackReason: creationMode === "draw" ? "Drawn manually on map." : "Provided by coordinate sequence.",
              }
            : await getPreferredFibreRoute(start, end);

          if (!directGeometry && route.routeMode !== "road") {
            toast.error("Road-following routing is required for direct asset routing. Use coordinate or manual drawing if you need custom bends.");
            return;
          }

          if (startAssetType === "mst" && endAssetType === "mst" && startNodeId && endNodeId) {
            createMstConnection.mutate(
              {
                startMstId: startNodeId,
                endMstId: endNodeId,
                geometry: route.geometry,
                coreCount,
              },
              {
                onSuccess: (createdCable) => {
                  const nextCable = hydrateCableRoute({
                    ...createdCable,
                    name: name?.trim() || createdCable.name,
                    cableType: cableType ?? createdCable.cableType ?? `${coreCount}-core`,
                    owner,
                    routeStatus,
                    routeType,
                    installationMethod,
                    installDate,
                    depthMeters,
                    heightMeters,
                    notes,
                    startAssetType,
                    startAssetName,
                    endAssetType,
                    endAssetName,
                    start: route.start,
                    end: route.end,
                    geometry: route.geometry,
                    coordinates: createdCable.coordinates.length ? createdCable.coordinates : route.geometry,
                    distanceMeters: createdCable.distanceMeters || route.distanceMeters,
                    routeMode: route.routeMode,
                    routeSource: route.routeSource,
                    routeFallbackReason: route.routeFallbackReason,
                    cores: createdCable.cores.length ? createdCable.cores : buildFreshCores(coreCount),
                  });
                  setLocalCables((prev) => [nextCable, ...prev]);
                  announceRouteResult(nextCable);
                  logWork(`Fibre cable created: ${nextCable.name}`, nextCable.toNodeId);
                  logWork(`Fibre cable created: ${nextCable.name}`, nextCable.fromNodeId);
                  logCableFlow(nextCable);
                },
              },
            );
            return;
          }

          const coordinateMatch = (point: { lat: number; lng: number }) =>
            localNodes.find(
              (node) =>
                Math.abs(node.location.lat - point.lat) < 0.000001 &&
                Math.abs(node.location.lng - point.lng) < 0.000001,
            );
          const startNode = coordinateMatch(start);
          const endNode = coordinateMatch(end);

          const generatedCable = hydrateCableRoute({
            id: randomId("cab"),
            name: name?.trim() || `Coordinate Fibre ${localCables.length + 1}`,
            coreCount,
            cableType: cableType ?? `${coreCount}-core`,
            owner,
            routeStatus,
            routeType,
            installationMethod,
            installDate,
            depthMeters,
            heightMeters,
            notes,
            fromNodeId: startNodeId ?? startNode?.id ?? randomId("coord-start"),
            toNodeId: endNodeId ?? endNode?.id ?? randomId("coord-end"),
            startAssetType: startAssetType ?? startNode?.type,
            startAssetName: startAssetName ?? startNode?.name,
            endAssetType: endAssetType ?? endNode?.type,
            endAssetName: endAssetName ?? endNode?.name,
            startMstId: startNode?.type === "mst" ? startNode.id : undefined,
            endMstId: endNode?.type === "mst" ? endNode.id : undefined,
            start: route.start,
            end: route.end,
            geometry: route.geometry,
            coordinates: route.geometry,
            distanceMeters: route.distanceMeters,
            routeMode: route.routeMode,
            routeSource: route.routeSource,
            routeFallbackReason: route.routeFallbackReason,
            faulted: false,
            cores: buildFreshCores(coreCount),
            splices: [],
          });
          setLocalCables((prev) => [generatedCable, ...prev]);
          announceRouteResult(generatedCable);
          logWork(`Coordinate fibre created: ${generatedCable.name}`);
          logCableFlow(generatedCable);
        }}
        onAssignCore={({ cableId, coreId }) => {
          assignCore.mutate(
            { cableId, coreId },
            {
              onSuccess: (payload) => {
                setLocalCables((prev) =>
                  prev.map((cable) =>
                    cable.id !== cableId
                      ? cable
                      : {
                          ...cable,
                          cores: cable.cores.map((core) => (core.id === payload.core.id ? payload.core : core)),
                        },
                  ),
                );
              },
            },
          );
        }}
        onAssignClient={async ({ mstId, portNumber, clientId, clientName, clientLocation, fiberCore, cableId, coreId, coreLabel }) => {
          const mstNode = localNodes.find((node) => node.id === mstId && node.type === "mst");
          const currentCustomer = localCustomers.find((customer) => customer.id === clientId);
          if (!mstNode || !currentCustomer) {
            toast.error("Unable to resolve MST or customer for this assignment.");
            return;
          }

          const route = await getPreferredFibreRoute(mstNode.location, clientLocation);
          if (route.routeMode !== "road") {
            toast.error("Road-following routing is required for client drops. Check the coordinates or Mapbox routing.");
            return;
          }

          assignClientToPort.mutate(
            {
              mstId,
              portNumber,
              clientId,
              clientName,
              clientLocation,
              fiberCore,
              cableId,
              coreId,
              coreLabel,
              geometry: route.geometry,
              routeMode: route.routeMode,
              routeSource: route.routeSource,
              routeFallbackReason: route.routeFallbackReason,
            },
            {
              onSuccess: (response) => {
                const typedResponse = response as {
                  mst?: NetworkNode;
                  customer?: Customer;
                  cable?: FibreCable;
                  core?: FibreCable["cores"][number];
                  replacedClientId?: string;
                };
                const replacedCustomerId = typedResponse.replacedClientId;

                if (replacedCustomerId) {
                  clearClientConnectionLocally(replacedCustomerId);
                }
                clearClientConnectionLocally(clientId);

                const nextMst =
                  typedResponse.mst ??
                  {
                        ...mstNode,
                        splitterPorts: (mstNode.splitterPorts ?? []).map((port) =>
                          port.port === portNumber
                            ? {
                                ...port,
                                status: "used",
                                customerId: clientId,
                                customerName: clientName,
                                assignedCoreColor: fiberCore,
                              }
                            : port,
                        ),
                        clients: [
                          ...(mstNode.clients ?? []).filter((client) => client.id !== clientId),
                          { id: clientId, name: clientName, splitterPort: portNumber, fiberCore },
                        ],
                      };
                upsertNodeLocally(nextMst);

                const nextCustomer =
                  typedResponse.customer ??
                  {
                    ...currentCustomer,
                    location: clientLocation,
                    mstId,
                    splitterPort: portNumber,
                    fibreCoreId: coreId,
                  };

                const nextCore =
                  typedResponse.core ??
                  {
                    ...(localCables.find((cable) => cable.id === cableId)?.cores.find((core) => core.id === coreId) ?? {
                      id: coreId,
                      index: 1,
                      label: coreLabel,
                      color: fiberCore,
                      status: "free" as const,
                    }),
                    status: "used" as const,
                    fromMstId: mstId,
                    toMstId: clientId,
                    assignedToCustomerId: clientId,
                    usagePath: `${coreLabel} core is assigned from ${mstId} to ${clientName} on splitter port ${portNumber}`,
                  };
                updateCableCoreLocally(cableId, nextCore);

                const fallbackDropCableId = currentCustomer.dropCableId ?? randomId("drop");
                const nextDropCable = hydrateCableRoute(
                  typedResponse.cable ??
                    buildDropCableLocally({
                      id: fallbackDropCableId,
                      mstId,
                      clientId,
                      clientName,
                      splitterPort: portNumber,
                      geometry: route.geometry,
                      coreId,
                      coreLabel,
                      fiberCore,
                      routeMode: route.routeMode,
                      routeSource: route.routeSource,
                      routeFallbackReason: route.routeFallbackReason,
                    }),
                );
                nextDropCable.slackLoops = [
                  {
                    id: randomId("slack"),
                    lengthMeters: 15,
                    location: `${mstNode.name} pole base`,
                    loopCount: 2,
                    coilDiameterMeters: 0.6,
                    note: "Drop slack reserved for maintenance reroute.",
                  },
                ];
                const resolvedCustomer = { ...nextCustomer, dropCableId: nextDropCable.id };
                setLocalCustomers((prev) => {
                  const index = prev.findIndex((entry) => entry.id === resolvedCustomer.id);
                  if (index === -1) return [resolvedCustomer, ...prev];
                  const next = [...prev];
                  next[index] = resolvedCustomer;
                  return next;
                });
                upsertCustomerNodeLocally(resolvedCustomer);
                upsertCableLocally(nextDropCable);
                announceRouteResult(nextDropCable);
                logWork(`Client ${clientName} assigned to Port ${portNumber} using ${coreLabel}`, mstId);
                logWork(`Client drop routed from ${mstId} to ${clientName}`, mstId);
                logCableFlow(nextDropCable);
              },
            },
          );
        }}
        onRemoveClient={({ mstId, portNumber }) => {
          removeClientFromPort.mutate(
            { mstId, portNumber },
            {
              onSuccess: (payload) => {
                setLocalNodes((prev) => prev.map((node) => (node.id === payload.mst.id ? payload.mst : node)));
                if (payload.removedClientId) {
                  clearClientConnectionLocally(payload.removedClientId);
                  logWork(`Client removed from Port ${portNumber}`, mstId);
                }
              },
            },
          );
        }}
        onChangeSplitterType={({ mstId, splitterType }) => {
          const portCap = Number(splitterType.split("/")[1]);
          const removedClientIds =
            localNodes
              .find((node) => node.id === mstId)
              ?.splitterPorts?.filter((port) => port.port > portCap && port.customerId)
              .map((port) => port.customerId as string) ?? [];

          updateSplitterType.mutate(
            { mstId, splitterType },
            {
              onSuccess: (updatedMst) => {
                setLocalNodes((prev) => prev.map((node) => (node.id === updatedMst.id ? updatedMst : node)));
                removedClientIds.forEach((clientId) => clearClientConnectionLocally(clientId));
                logWork(`Splitter changed to ${splitterType}`, mstId);
                removedClientIds.forEach((clientId) => logWork(`Client removed due to splitter change`, clientId));
              },
            },
          );
        }}
        onSetCoreState={(payload) => {
          setCableCoreState.mutate(payload, {
            onSuccess: (response) => {
              updateCableCoreLocally(payload.cableId, response.core);
              logWork(`Core ${response.core.label} ${payload.status === "used" ? "assigned" : "freed"}`, payload.cableId);
            },
          });
        }}
        onDeleteCable={({ cableId }) => {
          const targetCable = localCables.find((cable) => cable.id === cableId);
          if (targetCable?.segmentType === "drop" && targetCable.startMstId && targetCable.splitterPort) {
            removeClientFromPort.mutate(
              { mstId: targetCable.startMstId, portNumber: targetCable.splitterPort },
              {
                onSuccess: (payload) => {
                  setLocalNodes((prev) => prev.map((node) => (node.id === payload.mst.id ? payload.mst : node)));
                  if (payload.removedClientId) {
                    clearClientConnectionLocally(payload.removedClientId);
                  }
                },
              },
            );
            return;
          }

          const affectedCustomers =
            targetCable
              ?.cores.map((core) => core.assignedToCustomerId)
              .filter((customerId): customerId is string => Boolean(customerId)) ?? [];
          deleteFibreCable.mutate(
            { cableId },
            {
              onSuccess: () => {
                setLocalCables((prev) => prev.filter((cable) => cable.id !== cableId));
                detachCablesFromClosures([cableId]);
                affectedCustomers.forEach((customerId) => clearClientConnectionLocally(customerId));
                logWork("Fibre cable deleted", undefined);
              },
            },
          );
        }}
        onDeleteMst={({ mstId }) => {
          const removedCableIds = localCables
            .filter((cable) => cable.fromNodeId === mstId || cable.toNodeId === mstId)
            .map((cable) => cable.id);
          const affectedCustomers = Array.from(
            new Set([
              ...localCustomers.filter((customer) => customer.mstId === mstId).map((customer) => customer.id),
              ...localCables
                .filter((cable) => removedCableIds.includes(cable.id))
                .flatMap((cable) => cable.cores.map((core) => core.assignedToCustomerId))
                .filter((customerId): customerId is string => Boolean(customerId)),
            ]),
          );

          deleteNetworkNode.mutate(
            { nodeId: mstId },
            {
              onSuccess: (response) => {
                const typedResponse = response as { removedCableIds?: string[] } | undefined;
                const cablesToRemove = typedResponse?.removedCableIds?.length ? typedResponse.removedCableIds : removedCableIds;
                setLocalNodes((prev) => prev.filter((node) => node.id !== mstId));
                setLocalCables((prev) => prev.filter((cable) => !cablesToRemove.includes(cable.id)));
                detachCablesFromClosures(cablesToRemove);
                affectedCustomers.forEach((customerId) => clearClientConnectionLocally(customerId));
                logWork("MST deleted", mstId);
                cablesToRemove.forEach((cableId) => logWork("Cable removed due to MST deletion", cableId));
              },
            },
          );
        }}
        onDeleteNode={({ nodeId }) => {
          deleteNetworkNode.mutate(
            { nodeId },
            {
              onSuccess: () => {
                setLocalNodes((prev) => prev.filter((node) => node.id !== nodeId));
                logWork("Infrastructure node deleted", nodeId);
              },
            },
          );
        }}
        onDeleteClosure={({ closureId }) => {
          deleteClosure.mutate(
            { closureId },
            {
              onSuccess: () => {
                setLocalClosures((prev) => prev.filter((closure) => closure.id !== closureId));
                setLocalNodes((prev) => prev.filter((node) => !(node.type === "closure" && node.id === closureId)));
                logWork("Closure deleted", closureId);
              },
            },
          );
        }}
        onSaveSplice={(payload) => {
          upsertSplice.mutate(payload, {
            onSuccess: (updatedClosure) => {
              setLocalClosures((prev) => {
                const index = prev.findIndex((entry) => entry.id === updatedClosure.id);
                if (index === -1) return [updatedClosure, ...prev];
                const next = [...prev];
                next[index] = updatedClosure;
                return next;
              });
              logWork("Splice saved", payload.closureId);
            },
          });
        }}
        onDeleteSplice={(payload) => {
          deleteSplice.mutate(payload, {
            onSuccess: (updatedClosure) => {
              setLocalClosures((prev) => prev.map((entry) => (entry.id === updatedClosure.id ? updatedClosure : entry)));
              logWork("Splice removed", payload.closureId);
            },
          });
        }}
        onAddNote={({ nodeId, note }) => {
          addNodeNote(nodeId, note);
        }}
        workHistory={workHistory}
        canAdd={mapAccess.canAdd}
        canEdit={mapAccess.canEdit}
        canDelete={mapAccess.canDelete}
          canAssignClient={mapAccess.canAssignClient}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Current Fault Highlights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(faults ?? []).slice(0, 5).map((fault) => (
              <div key={fault.id} className="rounded-xl border border-border/70 bg-background/60 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{fault.title}</p>
                  <Badge variant={fault.severity === "critical" ? "danger" : "warning"}>{fault.severity}</Badge>
                </div>
                <p className="mt-1 text-muted-foreground">{fault.description}</p>
                {fault.affectedCableId ? (
                  <div className="mt-2 text-xs text-muted-foreground">
                    <p className="font-semibold uppercase tracking-[0.18em] text-[10px] text-muted-foreground">Affected Clients</p>
                    {localCables
                      .find((cable) => cable.id === fault.affectedCableId)
                      ?.cores.filter((core) => core.assignedToCustomerId)
                      .map((core) => {
                        const customer = localCustomers.find((entry) => entry.id === core.assignedToCustomerId);
                        return customer ? `${customer.name} (${core.label})` : undefined;
                      })
                      .filter(Boolean)
                      .map((label) => (
                        <p key={`${fault.id}-${label}`}>{label}</p>
                      ))}
                    {localCables
                      .find((cable) => cable.id === fault.affectedCableId)
                      ?.cores.filter((core) => core.assignedToCustomerId).length === 0 ? (
                      <p>No assigned clients on this cable.</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
            {(faults ?? []).length === 0 ? <p className="text-muted-foreground">No active faults.</p> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Field Work Log</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {workHistory.slice(0, 8).map((entry) => (
              <div key={entry.id} className="rounded-xl border border-border/70 bg-background/60 p-3">
                <p className="font-medium">{entry.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">{entry.timestamp}</p>
              </div>
            ))}
            {!workHistory.length ? <p className="text-muted-foreground">Map operations and route changes will appear here.</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}







