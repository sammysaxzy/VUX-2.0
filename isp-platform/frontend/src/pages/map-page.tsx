import { useEffect, useMemo, useState } from "react";
import { MapPinned, Route } from "lucide-react";
import { useCustomers } from "@/hooks/api/use-customers";
import { useFaults } from "@/hooks/api/use-faults";
import {
  useAssignClientToMstPort,
  useAssignCoreToCable,
  useClosures,
  useCreateMstConnection,
  useDeleteClosureSplice,
  useFibreCables,
  useNetworkNodes,
  useUpsertClosureSplice,
} from "@/hooks/api/use-network";
import type { ClosureBox, Customer, FibreCable, GeoPoint, MstConnectionDraft, NetworkNode } from "@/types";
import { MapComponent } from "@/components/map/map-component";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export function MapPage() {
  const { data: nodes, isLoading: nodesLoading } = useNetworkNodes();
  const { data: cables, isLoading: cableLoading } = useFibreCables();
  const { data: closures, isLoading: closureLoading } = useClosures();
  const { data: customers, isLoading: customerLoading } = useCustomers();
  const { data: faults } = useFaults();
  const createConnection = useCreateMstConnection();
  const assignCore = useAssignCoreToCable();
  const assignClientToPort = useAssignClientToMstPort();
  const upsertSplice = useUpsertClosureSplice();
  const deleteSplice = useDeleteClosureSplice();
  const [localNodes, setLocalNodes] = useState<NetworkNode[]>([]);
  const [localCables, setLocalCables] = useState<FibreCable[]>([]);
  const [localClosures, setLocalClosures] = useState<ClosureBox[]>([]);
  const [localCustomers, setLocalCustomers] = useState<Customer[]>([]);
  const [draftRoute, setDraftRoute] = useState<{ start: GeoPoint; end: GeoPoint; distanceMeters: number }>();

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

  if (nodesLoading || cableLoading || closureLoading || customerLoading || !cables || !closures || !customers) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Interactive Fibre Map</h1>
          <p className="text-sm text-muted-foreground">Click map to add OLT/MST/pole/closure and draft routes with distance.</p>
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
        onInfrastructureAdded={(node) => setLocalNodes((prev) => [node, ...prev])}
        onRouteDrafted={(route) => setDraftRoute(route)}
        onCreateMstConnection={(draft: MstConnectionDraft) => {
          createConnection.mutate(
            {
              startMstId: draft.startMstId,
              endMstId: draft.endMstId,
              geometry: [draft.start, draft.end],
              coreCount: draft.coreCount,
            },
            {
              onSuccess: (createdCable) => setLocalCables((prev) => [createdCable, ...prev]),
            },
          );
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
                        }
                      : customer,
                  ),
                );
                if (cableId && coreId) {
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
                        setLocalCustomers((prev) =>
                          prev.map((customer) =>
                            customer.id === clientId
                              ? {
                                  ...customer,
                                  fibreCoreId: payload.core.id,
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="h-4 w-4 text-primary" />
              Route Draft Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {draftRoute ? (
              <>
                <p>
                  Start: {draftRoute.start.lat.toFixed(5)}, {draftRoute.start.lng.toFixed(5)}
                </p>
                <p>
                  End: {draftRoute.end.lat.toFixed(5)}, {draftRoute.end.lng.toFixed(5)}
                </p>
                <p className="font-medium text-primary">Distance: {draftRoute.distanceMeters} meters</p>
              </>
            ) : (
              <p className="text-muted-foreground">No route drafted yet. Click two points on the map.</p>
            )}
          </CardContent>
        </Card>

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
