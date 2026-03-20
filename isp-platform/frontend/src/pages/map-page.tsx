import { useEffect, useMemo, useState } from "react";
import length from "@turf/length";
import { lineString } from "@turf/helpers";
import { MapPinned } from "lucide-react";
import { toast } from "sonner";
import { FIBRE_CORE_PALETTE } from "@/constants/fibre";
import { useCustomers } from "@/hooks/api/use-customers";
import { useFaults } from "@/hooks/api/use-faults";
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
import type { ClosureBox, Customer, FibreCable, NetworkNode } from "@/types";
import { MapComponent } from "@/components/map/map-component";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { randomId } from "@/lib/utils";

export function MapPage() {
  const { data: nodes, isLoading: nodesLoading } = useNetworkNodes();
  const { data: cables, isLoading: cableLoading } = useFibreCables();
  const { data: closures, isLoading: closureLoading } = useClosures();
  const { data: customers, isLoading: customerLoading } = useCustomers();
  const { data: faults } = useFaults();
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

  const buildFreshCores = (coreCount: 2 | 4 | 8 | 12 | 24): FibreCable["cores"] =>
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

  const calculateDistanceMeters = (start: { lat: number; lng: number }, end: { lat: number; lng: number }) =>
    Math.round(
      length(
        lineString([
          [start.lng, start.lat],
          [end.lng, end.lat],
        ]),
        { units: "kilometers" },
      ) * 1000,
    );

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

  const releaseCustomerLocally = (customerId: string) => {
    setLocalCustomers((prev) =>
      prev.map((customer) =>
        customer.id === customerId
          ? {
              ...customer,
              mstId: undefined,
              splitterPort: undefined,
              fibreCoreId: undefined,
            }
          : customer,
      ),
    );
    setLocalCables((prev) =>
      prev.map((cable) => ({
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

  if (nodesLoading || cableLoading || closureLoading || customerLoading || !cables || !closures || !customers) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Interactive Fibre Map</h1>
          <p className="text-sm text-muted-foreground">Create MST/closures and fibre links from coordinates, then inspect and edit on-map.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <MapPinned className="h-3.5 w-3.5" />
            {localNodes.length} nodes
          </Badge>
          <Badge variant="danger">{faults?.length ?? 0} faults</Badge>
        </div>
      </div>

      <MapComponent
        nodes={localNodes}
        cables={localCables}
        closures={localClosures}
        customers={localCustomers}
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
        }}
        onCreateFiber={({ name, start, end, coreCount, startMstId, endMstId }) => {
          if (startMstId && endMstId) {
            createMstConnection.mutate(
              {
                startMstId,
                endMstId,
                geometry: [start, end],
                coreCount,
              },
              {
                onSuccess: (createdCable) => {
                  const nextCable: FibreCable = {
                    ...createdCable,
                    name: name?.trim() || createdCable.name,
                    distanceMeters: createdCable.distanceMeters || calculateDistanceMeters(start, end),
                    coordinates: createdCable.coordinates.length ? createdCable.coordinates : [start, end],
                    cores: createdCable.cores.length ? createdCable.cores : buildFreshCores(coreCount),
                  };
                  setLocalCables((prev) => [nextCable, ...prev]);
                  toast.success(`${nextCable.coreCount}-core fibre linked between selected MSTs.`);
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

          const generatedCable: FibreCable = {
            id: randomId("cab"),
            name: name?.trim() || `Coordinate Fibre ${localCables.length + 1}`,
            coreCount,
            fromNodeId: startNode?.id ?? randomId("coord-start"),
            toNodeId: endNode?.id ?? randomId("coord-end"),
            startMstId: startNode?.type === "mst" ? startNode.id : undefined,
            endMstId: endNode?.type === "mst" ? endNode.id : undefined,
            coordinates: [start, end],
            distanceMeters: calculateDistanceMeters(start, end),
            faulted: false,
            cores: buildFreshCores(coreCount),
            splices: [],
          };
          setLocalCables((prev) => [generatedCable, ...prev]);
          toast.success(`${generatedCable.coreCount}-core fibre created from coordinates.`);
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
        onAssignClient={({ mstId, portNumber, clientId, clientName, fiberCore, cableId, coreId }) => {
          const previousCustomer = localCustomers.find((customer) => customer.id === clientId);
          const previouslyAssignedCores = localCables.flatMap((cable) =>
            cable.cores
              .filter((core) => core.assignedToCustomerId === clientId)
              .map((core) => ({ cableId: cable.id, core })),
          );

          assignClientToPort.mutate(
            {
              mstId,
              portNumber,
              clientId,
              clientName,
              fiberCore,
            },
            {
              onSuccess: (updatedMst) => {
                setLocalNodes((prev) => prev.map((node) => (node.id === updatedMst.id ? updatedMst : node)));
                setLocalCustomers((prev) =>
                  prev.map((customer) =>
                    customer.id === clientId
                      ? {
                          ...customer,
                          mstId,
                          splitterPort: portNumber,
                          fibreCoreId: coreId ?? customer.fibreCoreId,
                        }
                      : customer,
                  ),
                );

                previouslyAssignedCores
                  .filter((entry) => !(entry.cableId === cableId && entry.core.id === coreId))
                  .forEach((entry) => {
                    setCableCoreState.mutate(
                      { cableId: entry.cableId, coreId: entry.core.id, status: "free" },
                      {
                        onSuccess: (response) => updateCableCoreLocally(entry.cableId, response.core),
                      },
                    );
                  });

                if (previousCustomer?.fibreCoreId && previouslyAssignedCores.length === 0) {
                  const fallback = localCables.find((cable) => cable.cores.some((core) => core.id === previousCustomer.fibreCoreId));
                  const fallbackCore = fallback?.cores.find((core) => core.id === previousCustomer.fibreCoreId);
                  if (fallback && fallbackCore && !(fallback.id === cableId && fallbackCore.id === coreId)) {
                    setCableCoreState.mutate(
                      { cableId: fallback.id, coreId: fallbackCore.id, status: "free" },
                      {
                        onSuccess: (response) => updateCableCoreLocally(fallback.id, response.core),
                      },
                    );
                  }
                }

                if (cableId && coreId) {
                  setCableCoreState.mutate(
                    {
                      cableId,
                      coreId,
                      status: "used",
                      fromMstId: mstId,
                      toMstId: clientId,
                      assignedToCustomerId: clientId,
                      usagePath: `${fiberCore} core is assigned from ${mstId} to ${clientName}`,
                    },
                    {
                      onSuccess: (payload) => {
                        updateCableCoreLocally(cableId, payload.core);
                        setLocalCustomers((prev) =>
                          prev.map((customer) =>
                            customer.id === clientId
                              ? {
                                  ...customer,
                                  mstId,
                                  splitterPort: portNumber,
                                  fibreCoreId: coreId,
                                }
                              : customer,
                          ),
                        );
                      },
                    },
                  );
                }
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
                  releaseCustomerLocally(payload.removedClientId);
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
                removedClientIds.forEach((clientId) => releaseCustomerLocally(clientId));
              },
            },
          );
        }}
        onSetCoreState={(payload) => {
          setCableCoreState.mutate(payload, {
            onSuccess: (response) => updateCableCoreLocally(payload.cableId, response.core),
          });
        }}
        onDeleteCable={({ cableId }) => {
          const affectedCustomers =
            localCables
              .find((cable) => cable.id === cableId)
              ?.cores.map((core) => core.assignedToCustomerId)
              .filter((customerId): customerId is string => Boolean(customerId)) ?? [];
          deleteFibreCable.mutate(
            { cableId },
            {
              onSuccess: () => {
                setLocalCables((prev) => prev.filter((cable) => cable.id !== cableId));
                detachCablesFromClosures([cableId]);
                affectedCustomers.forEach((customerId) => releaseCustomerLocally(customerId));
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
                affectedCustomers.forEach((customerId) => releaseCustomerLocally(customerId));
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
            },
          });
        }}
        onDeleteSplice={(payload) => {
          deleteSplice.mutate(payload, {
            onSuccess: (updatedClosure) => {
              setLocalClosures((prev) => prev.map((entry) => (entry.id === updatedClosure.id ? updatedClosure : entry)));
            },
          });
        }}
      />

      <div className="grid gap-4">
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
              </div>
            ))}
            {(faults ?? []).length === 0 ? <p className="text-muted-foreground">No active faults.</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}







