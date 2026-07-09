import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  Cable,
  CalendarClock,
  Camera,
  Download,
  GitBranch,
  Layers3,
  Map as MapIcon,
  Radar,
  Route,
  ShieldAlert,
  ThermometerSun,
  TowerControl,
  Users,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import type { Customer, Fault, FibreCable, NetworkNode } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { calculatePolylineDistanceMeters, formatCableDistance } from "@/lib/fibre-routing";
import { cn } from "@/lib/utils";

type NetworkGisWorkbenchProps = {
  nodes: NetworkNode[];
  cables: FibreCable[];
  customers: Customer[];
  faults: Fault[];
  selectedCable?: FibreCable;
  selectedCustomer?: Customer;
};

type TopologyHop = {
  label: string;
  type: string;
  status: string;
};

const CURRENCY = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

function summarizeNodeStatus(node?: NetworkNode) {
  if (!node) return "Not linked";
  if (node.status === "fault") return "Fault";
  if (node.status === "warning") return "Warning";
  return "Healthy";
}

function summarizeCustomerRisk(customer: Customer) {
  if (customer.accountStatus === "suspended") return "Suspended";
  if (!customer.online) return "Offline";
  if (customer.rxSignal <= -27) return "Weak optical power";
  if (customer.paymentStatus === "overdue") return "Overdue";
  return "Healthy";
}

function buildTopologyPath(customer: Customer | undefined, nodes: NetworkNode[], cables: FibreCable[]) {
  if (!customer) return [] as TopologyHop[];
  const customerNode = nodes.find((node) => (node.id === customer.id) || (node.type === "customer" && node.name === customer.name));
  const mst = customer.mstId ? nodes.find((node) => node.id === customer.mstId) : undefined;
  const dropCable = customer.dropCableId ? cables.find((cable) => cable.id === customer.dropCableId) : undefined;
  const upstreamCables = mst ? cables.filter((cable) => cable.toNodeId === mst.id || cable.fromNodeId === mst.id) : [];
  const closure = upstreamCables
    .map((cable) => nodes.find((node) => node.id === cable.fromNodeId || node.id === cable.toNodeId))
    .find((node) => node?.type === "closure");
  const olt = nodes.find((node) => node.type === "olt" && node.name === customer.oltName) ?? nodes.find((node) => node.type === "olt");
  const pop = nodes.find((node) => node.type === "pop");

  return [
    { label: pop?.name ?? "Internet Provider", type: "pop", status: summarizeNodeStatus(pop) },
    { label: olt?.name ?? customer.oltName ?? "Core Router", type: "olt", status: summarizeNodeStatus(olt) },
    { label: closure?.name ?? "Closure / Splitter", type: "closure", status: summarizeNodeStatus(closure) },
    { label: mst?.name ?? "MST", type: "mst", status: summarizeNodeStatus(mst) },
    { label: dropCable?.name ?? "Drop Cable", type: "drop", status: dropCable?.faulted ? "Fault" : "Healthy" },
    { label: customerNode?.name ?? customer.name, type: "customer", status: summarizeCustomerRisk(customer) },
  ];
}

function estimateBuildCost(distanceMeters: number, cable: FibreCable | undefined) {
  const distanceKm = distanceMeters / 1000;
  const cableRate = cable?.installationMethod === "aerial" ? 320000 : 420000;
  const poleCost = cable?.installationMethod === "aerial" ? 180000 : 0;
  const closureCost = 95000;
  const splitterCost = 55000;
  const laborCost = 125000 * Math.max(distanceKm, 0.5);
  return {
    cableCost: Math.round(distanceKm * cableRate),
    poleCost,
    closureCost,
    splitterCost,
    laborCost: Math.round(laborCost),
    total: Math.round(distanceKm * cableRate + poleCost + closureCost + splitterCost + laborCost),
  };
}

function getCableImpact(cable: FibreCable | undefined, customers: Customer[], cables: FibreCable[], nodes: NetworkNode[]) {
  if (!cable) {
    return {
      customers: [] as Customer[],
      msts: [] as NetworkNode[],
      closures: [] as NetworkNode[],
      olt: undefined as NetworkNode | undefined,
      paths: [] as string[],
      impactedCableIds: [] as string[],
    };
  }

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const cablesByNode = new Map<string, FibreCable[]>();
  cables.forEach((entry) => {
    cablesByNode.set(entry.fromNodeId, [...(cablesByNode.get(entry.fromNodeId) ?? []), entry]);
    cablesByNode.set(entry.toNodeId, [...(cablesByNode.get(entry.toNodeId) ?? []), entry]);
  });

  const queue: Array<{ nodeId: string; path: string[] }> = [
    { nodeId: cable.fromNodeId, path: [cable.name, nodeMap.get(cable.fromNodeId)?.name ?? cable.fromNodeId] },
    { nodeId: cable.toNodeId, path: [cable.name, nodeMap.get(cable.toNodeId)?.name ?? cable.toNodeId] },
  ];
  const visitedNodes = new Set<string>();
  const visitedCableIds = new Set<string>([cable.id]);
  const mstPaths = new Map<string, string[]>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visitedNodes.has(current.nodeId)) continue;
    visitedNodes.add(current.nodeId);

    const node = nodeMap.get(current.nodeId);
    if (node?.type === "mst") {
      mstPaths.set(node.id, current.path);
    }

    const adjacent = cablesByNode.get(current.nodeId) ?? [];
    adjacent.forEach((adjacentCable) => {
      if (visitedCableIds.has(adjacentCable.id)) return;
      visitedCableIds.add(adjacentCable.id);
      const nextNodeId = adjacentCable.fromNodeId === current.nodeId ? adjacentCable.toNodeId : adjacentCable.fromNodeId;
      const nextNode = nodeMap.get(nextNodeId);
      queue.push({
        nodeId: nextNodeId,
        path: [...current.path, adjacentCable.name, nextNode?.name ?? nextNodeId],
      });
    });
  }

  const impactedCustomers = customers.filter((customer) => {
    if (customer.dropCableId === cable.id) return true;
    if (customer.mstId && mstPaths.has(customer.mstId)) return true;
    return false;
  });

  const msts = nodes.filter((node) => node.type === "mst" && mstPaths.has(node.id));
  const closures = nodes.filter((node) => node.type === "closure" && visitedNodes.has(node.id));
  const olt = nodes.find((node) => node.type === "olt" && visitedNodes.has(node.id))
    ?? nodes.find((node) => node.type === "olt" && impactedCustomers.some((customer) => customer.oltName === node.name));

  const paths = impactedCustomers.slice(0, 8).map((customer) => {
    const mstPath = customer.mstId ? mstPaths.get(customer.mstId) ?? [] : [];
    const dropCable = cables.find((entry) => entry.id === customer.dropCableId);
    return [...mstPath, dropCable?.name ?? "Drop cable", customer.name].filter(Boolean).join(" -> ");
  });

  return { customers: impactedCustomers, msts, closures, olt, paths, impactedCableIds: [...visitedCableIds] };
}

export function NetworkGisWorkbench({
  nodes,
  cables,
  customers,
  faults,
  selectedCable,
  selectedCustomer,
}: NetworkGisWorkbenchProps) {
  const [timeView, setTimeView] = useState<"today" | "last_month" | "last_year" | "future" | "construction">("today");
  const [activeCard, setActiveCard] = useState<string | null>(null);

  const getClickableCardProps = (cardId: string, message: string, extraClassName?: string) => ({
    role: "button" as const,
    tabIndex: 0,
    onClick: () => {
      setActiveCard(cardId);
      toast.info(message);
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setActiveCard(cardId);
        toast.info(message);
      }
    },
    className: cn(
      "cursor-pointer transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
      activeCard === cardId && "border-primary/70 ring-2 ring-primary/20",
      extraClassName,
    ),
  });

  const topologyPath = useMemo(() => buildTopologyPath(selectedCustomer, nodes, cables), [selectedCustomer, nodes, cables]);
  const selectedDistance = selectedCable ? calculatePolylineDistanceMeters(selectedCable.geometry?.length ? selectedCable.geometry : selectedCable.coordinates) : 0;
  const buildCost = useMemo(() => estimateBuildCost(selectedDistance, selectedCable), [selectedDistance, selectedCable]);
  const cableImpact = useMemo(() => getCableImpact(selectedCable, customers, cables, nodes), [selectedCable, customers, cables, nodes]);

  const capacityHotspots = useMemo(
    () =>
      nodes
        .filter((node) => node.type === "mst")
        .map((node) => {
          const total = node.splitterPorts?.length ?? 0;
          const used = node.splitterPorts?.filter((port) => port.status === "used").length ?? 0;
          const percent = total > 0 ? Math.round((used / total) * 100) : 0;
          return { id: node.id, name: node.name, total, used, percent };
        })
        .sort((left, right) => right.percent - left.percent)
        .slice(0, 5),
    [nodes],
  );

  const networkAnalytics = useMemo(() => {
    const totalFiberMeters = cables.reduce(
      (sum, cable) => sum + calculatePolylineDistanceMeters(cable.geometry?.length ? cable.geometry : cable.coordinates),
      0,
    );
    const onlineCustomers = customers.filter((customer) => customer.online).length;
    const weakSignalCustomers = customers.filter((customer) => customer.rxSignal <= -27).length;
    const plannedRoutes = cables.filter((cable) => cable.routeStatus === "planned").length;
    return { totalFiberMeters, onlineCustomers, weakSignalCustomers, plannedRoutes };
  }, [cables, customers]);

  const coverageZones = useMemo(() => {
    const buckets = new Map<string, { label: string; customers: number }>();
    customers.forEach((customer) => {
      const label = customer.serviceLocation || customer.address.split(",")[0] || "Unknown Zone";
      const key = label.toLowerCase();
      const current = buckets.get(key) ?? { label, customers: 0 };
      current.customers += 1;
      buckets.set(key, current);
    });
    return [...buckets.values()].sort((left, right) => right.customers - left.customers).slice(0, 5);
  }, [customers]);

  const poles = useMemo(
    () =>
      nodes
        .filter((node) => node.type === "pole")
        .map((node, index) => ({
          id: node.id,
          number: `${14 + index}${String.fromCharCode(65 + (index % 5))}`,
          owner: ["IKEDC", "PHCN", "Private"][index % 3],
          type: ["Concrete", "Wood", "Steel"][index % 3],
          condition: ["Good", "Fair", "Needs replacement"][index % 3],
          height: `${10 + index} m`,
          photoState: index % 2 === 0 ? "Before/After ready" : "Current condition only",
          equipment: index % 2 === 0 ? "Drop clamp, splitter, slack loop" : "Distribution cable, anchor set",
          inspectionDate: `2026-0${(index % 6) + 1}-1${index % 8}`,
          node,
        })),
    [nodes],
  );

  const manholes = useMemo(
    () =>
      nodes
        .filter((node) => node.type === "manhole" || node.type === "closure")
        .map((node, index) => ({
          id: node.id,
          type: node.type === "manhole" ? "Handhole" : "Closure chamber",
          depth: `${1.2 + index * 0.2} m`,
          size: `${600 + index * 100} x ${600 + index * 100} mm`,
          connectedDucts: 2 + (index % 3),
          connectedClosures: node.type === "closure" ? 1 : index % 2,
          condition: ["Good", "Silted", "Needs cleaning"][index % 3],
          inspection: `2026-0${(index % 6) + 1}-0${(index % 8) + 1}`,
          node,
        })),
    [nodes],
  );

  const ducts = useMemo(
    () =>
      cables
        .filter((cable) => cable.installationMethod === "duct" || cable.installationMethod === "underground")
        .slice(0, 5)
        .map((cable, index) => ({
          id: cable.id,
          name: cable.name,
          size: ["40 mm", "32 mm", "50 mm"][index % 3],
          total: 4 + (index % 3) * 2,
          used: 2 + (index % 2),
          spare: 1 + (index % 2),
          blocked: index % 3 === 0 ? 1 : 0,
          route: cable.startAssetName && cable.endAssetName ? `${cable.startAssetName} -> ${cable.endAssetName}` : `${cable.fromNodeId} -> ${cable.toNodeId}`,
        })),
    [cables],
  );

  const opticalHeatmap = useMemo(
    () =>
      customers
        .slice()
        .sort((left, right) => left.rxSignal - right.rxSignal)
        .slice(0, 6)
        .map((customer) => ({
          id: customer.id,
          name: customer.name,
          rx: customer.rxSignal,
          status:
            customer.rxSignal <= -28 ? "critical" :
            customer.rxSignal <= -26 ? "weak" :
            customer.rxSignal <= -24 ? "slight_loss" :
            "good",
        })),
    [customers],
  );

  const technicians = useMemo(() => {
    const names = [...new Set(customers.map((customer) => customer.assignedEngineer).filter(Boolean))].slice(0, 4);
    return names.map((name, index) => ({
      name,
      job: index % 2 === 0 ? "Fault repair" : "Installation",
      eta: `${12 + index} min`,
      completed: 3 + index * 2,
      location: coverageZones[index]?.label ?? "On route",
    }));
  }, [coverageZones, customers]);

  const routeHistory = useMemo(() => {
    if (!selectedCable) return [] as Array<{ version: string; summary: string; date: string }>;
    return [
      { version: "Version 3", summary: `Current route with ${selectedCable.geometry?.length ?? selectedCable.coordinates.length} points`, date: "2026-07-09" },
      { version: "Version 2", summary: "Adjusted around road crossing and pole congestion", date: "2026-06-19" },
      { version: "Version 1", summary: "Original survey alignment", date: "2026-05-28" },
    ];
  }, [selectedCable]);

  const impactAnalysis = useMemo(() => {
    const impacted = cableImpact.customers;
    const businessCount = impacted.filter((customer) => /hub|office|biz|enterprise|school|clinic/i.test(customer.name)).length;
    const dedicatedCount = impacted.filter((customer) => customer.slaTier === "gold" || /dedicated/i.test(customer.planName ?? "")).length;
    const nearestTechnician = technicians[0]?.name ?? "Dispatch queue";
    const requiredFiberLength = formatCableDistance(selectedDistance > 0 ? Math.round(selectedDistance * 1.08) : 420);
    return {
      customers: impacted.length,
      businessCount,
      dedicatedCount,
      msts: cableImpact.msts.length,
      closures: cableImpact.closures.length,
      paths: cableImpact.paths,
      impactedCables: cableImpact.impactedCableIds.length,
      nearestTechnician,
      requiredFiberLength,
      pigtails: Math.max(2, cableImpact.closures.length * 4),
      closuresNeeded: Math.max(1, cableImpact.closures.length),
      spliceTrays: Math.max(1, Math.ceil((selectedCable?.coreCount ?? 12) / 24)),
      estimatedRepairHours: Math.max(2, Math.ceil((selectedDistance || 800) / 600)),
      rerouting: selectedCable?.routeStatus === "planned" ? "Use planned diversion path nearby." : "Recommend temporary aerial bypass while permanent civil work is prepared.",
    };
  }, [cableImpact.closures.length, cableImpact.customers, cableImpact.impactedCableIds.length, cableImpact.msts.length, cableImpact.paths, selectedCable, selectedDistance, technicians]);

  const cableUtilization = useMemo(
    () =>
      cables
        .map((cable) => {
          const used = cable.cores.filter((core) => core.status === "used").length;
          const reserved = cable.cores.filter((core) => core.status === "reserved").length;
          const utilizationPercent = cable.coreCount > 0 ? Math.round(((used + reserved) / cable.coreCount) * 100) : 0;
          return { id: cable.id, name: cable.name, utilizationPercent, used, reserved, total: cable.coreCount };
        })
        .sort((left, right) => right.utilizationPercent - left.utilizationPercent)
        .slice(0, 6),
    [cables],
  );

  const capacityForecast = useMemo(
    () =>
      capacityHotspots.map((hotspot, index) => ({
        id: hotspot.id,
        name: hotspot.name,
        monthsToFull: hotspot.percent >= 95 ? 1 : hotspot.percent >= 85 ? 3 : hotspot.percent >= 70 ? 6 : 12 + index,
        note: hotspot.percent >= 85 ? "Expansion planning required soon." : "Current growth still within comfort range.",
      })),
    [capacityHotspots],
  );

  const constructionProjects = useMemo(
    () => [
      { name: "Omole Phase 2", progress: ["Survey", "Duct", "Manhole", "Cable", "Splicing", "Testing", "Activation"], completed: 5 },
      { name: "Lekki Waterfront Build", progress: ["Survey", "Duct", "Manhole", "Cable", "Splicing", "Testing", "Activation"], completed: 3 },
    ],
    [],
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[1.6fr,1fr]">
      <div className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card {...getClickableCardProps("live-coverage", "Coverage insights selected for quick review.", "border-cyan-200/60 bg-cyan-50/60 dark:border-cyan-900/50 dark:bg-cyan-950/20")}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm"><MapIcon className="h-4 w-4" /> Live Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{coverageZones.length}</p>
              <p className="text-xs text-muted-foreground">High-density estates and service zones</p>
            </CardContent>
          </Card>
          <Card {...getClickableCardProps("total-fiber", "Total fibre summary selected.", "border-emerald-200/60 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20")}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm"><Cable className="h-4 w-4" /> Total Fiber</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatCableDistance(networkAnalytics.totalFiberMeters)}</p>
              <p className="text-xs text-muted-foreground">{networkAnalytics.plannedRoutes} planned routes awaiting build</p>
            </CardContent>
          </Card>
          <Card {...getClickableCardProps("optical-risk", "Optical risk summary selected.", "border-amber-200/60 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/20")}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm"><Activity className="h-4 w-4" /> Optical Risk</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{networkAnalytics.weakSignalCustomers}</p>
              <p className="text-xs text-muted-foreground">Customers below -27 dBm</p>
            </CardContent>
          </Card>
          <Card {...getClickableCardProps("active-faults", "Active fault summary selected.", "border-rose-200/60 bg-rose-50/60 dark:border-rose-900/50 dark:bg-rose-950/20")}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm"><ShieldAlert className="h-4 w-4" /> Active Faults</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{faults.filter((fault) => fault.status !== "resolved").length}</p>
              <p className="text-xs text-muted-foreground">{networkAnalytics.onlineCustomers} customers currently online</p>
            </CardContent>
          </Card>
        </div>

        <Card {...getClickableCardProps("digital-twin", "Digital twin and service path card selected.")}>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base"><GitBranch className="h-4 w-4" /> Digital Twin & Service Path</CardTitle>
              <p className="text-sm text-muted-foreground">Provider to OLT to closure to MST to customer with route and status context.</p>
            </div>
            <Badge variant="outline">{selectedCustomer ? "Customer Focus" : "Select a customer on the map"}</Badge>
          </CardHeader>
          <CardContent>
            {topologyPath.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-6">
                {topologyPath.map((hop, index) => (
                  <div key={`${hop.type}-${index}`} className="rounded-2xl border border-border/70 bg-background/70 p-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{hop.type}</p>
                    <p className="mt-2 text-sm font-semibold">{hop.label}</p>
                    <Badge className="mt-3" variant={hop.status === "Fault" ? "danger" : hop.status === "Warning" ? "outline" : "success"}>
                      {hop.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Selecting a customer reveals the service chain, likely serving assets, and operational health.</p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card {...getClickableCardProps("build-cost", "Build cost estimator selected.")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Route className="h-4 w-4" /> Route Designer & BoM</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border border-border/70 bg-background/70 p-3 text-sm">
                <p><span className="text-muted-foreground">Selected route:</span> {selectedCable?.name ?? "No route selected"}</p>
                <p><span className="text-muted-foreground">Route length:</span> {formatCableDistance(selectedDistance)}</p>
                <p><span className="text-muted-foreground">Build status:</span> {selectedCable?.routeStatus ?? "planned"}</p>
                <p><span className="text-muted-foreground">Install method:</span> {selectedCable?.installationMethod ?? "underground"}</p>
                <p><span className="text-muted-foreground">Route type:</span> {selectedCable?.routeType ?? "distribution"}</p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Estimate</TableHead>
                    <TableHead>Budget</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Fiber cable</TableCell>
                    <TableCell>{formatCableDistance(selectedDistance)}</TableCell>
                    <TableCell>{CURRENCY.format(buildCost.cableCost)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Poles / support structures</TableCell>
                    <TableCell>{selectedCable?.installationMethod === "aerial" ? "Support run" : "Not required"}</TableCell>
                    <TableCell>{CURRENCY.format(buildCost.poleCost)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Closures and splice trays</TableCell>
                    <TableCell>1 set</TableCell>
                    <TableCell>{CURRENCY.format(buildCost.closureCost)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Labor and field work</TableCell>
                    <TableCell>{selectedDistance ? `${Math.max(1, Math.ceil(selectedDistance / 600))} crew-days` : "0 crew-days"}</TableCell>
                    <TableCell>{CURRENCY.format(buildCost.laborCost)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="rounded-2xl border border-emerald-300/60 bg-emerald-50/60 p-3 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <span className="font-semibold">Estimated build total:</span> {CURRENCY.format(buildCost.total)}
              </div>
            </CardContent>
          </Card>

          <Card {...getClickableCardProps("impact-analysis", "Impact analysis card selected.")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4" /> One-Click Impact Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-border/70 bg-background/70 p-3 text-sm">
                  <p className="text-muted-foreground">Affected customers</p>
                  <p className="mt-1 text-2xl font-semibold">{impactAnalysis.customers}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 p-3 text-sm">
                  <p className="text-muted-foreground">Business clients</p>
                  <p className="mt-1 text-2xl font-semibold">{impactAnalysis.businessCount}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 p-3 text-sm">
                  <p className="text-muted-foreground">Dedicated clients</p>
                  <p className="mt-1 text-2xl font-semibold">{impactAnalysis.dedicatedCount}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 p-3 text-sm">
                  <p className="text-muted-foreground">Offline MSTs</p>
                  <p className="mt-1 text-2xl font-semibold">{impactAnalysis.msts}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 p-3 text-sm">
                  <p className="text-muted-foreground">Affected closures</p>
                  <p className="mt-1 text-2xl font-semibold">{impactAnalysis.closures}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 p-3 text-sm">
                  <p className="text-muted-foreground">Affected cable spans</p>
                  <p className="mt-1 text-2xl font-semibold">{impactAnalysis.impactedCables}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-red-300/60 bg-red-50/60 p-3 text-sm dark:border-red-900/50 dark:bg-red-950/20">
                <p><span className="text-muted-foreground">Nearest technician:</span> {impactAnalysis.nearestTechnician}</p>
                <p><span className="text-muted-foreground">Estimated repair time:</span> {impactAnalysis.estimatedRepairHours} hours</p>
                <p><span className="text-muted-foreground">Required fiber length:</span> {impactAnalysis.requiredFiberLength}</p>
                <p><span className="text-muted-foreground">Required pigtails:</span> {impactAnalysis.pigtails}</p>
                <p><span className="text-muted-foreground">Required closures:</span> {impactAnalysis.closuresNeeded}</p>
                <p><span className="text-muted-foreground">Required splice trays:</span> {impactAnalysis.spliceTrays}</p>
                <p><span className="text-muted-foreground">Suggested rerouting:</span> {impactAnalysis.rerouting}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/70 p-3 text-sm">
                <p className="font-semibold">Exact downstream fault paths</p>
                <div className="mt-2 space-y-2">
                  {impactAnalysis.paths.length > 0 ? impactAnalysis.paths.map((path) => (
                    <div key={path} className="rounded-lg border border-border/60 bg-background/80 p-2 text-xs text-muted-foreground">
                      {path}
                    </div>
                  )) : <p className="text-xs text-muted-foreground">Select a cable to trace downstream service paths.</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card {...getClickableCardProps("pole-management", "Pole management card selected.")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><TowerControl className="h-4 w-4" /> Pole Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {poles.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pole</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Condition</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {poles.map((pole) => (
                      <TableRow key={pole.id}>
                        <TableCell>
                          <p className="font-medium">{pole.node.name}</p>
                          <p className="text-xs text-muted-foreground">No. {pole.number} • {pole.height}</p>
                        </TableCell>
                        <TableCell>{pole.owner}</TableCell>
                        <TableCell>{pole.type}</TableCell>
                        <TableCell>
                          <Badge variant={pole.condition === "Needs replacement" ? "danger" : pole.condition === "Fair" ? "warning" : "success"}>
                            {pole.condition}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">Add pole assets to start tracking owners, mounted equipment, and inspections.</p>
              )}
            </CardContent>
          </Card>

          <Card {...getClickableCardProps("manholes-ducts", "Manhole and duct management card selected.")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Layers3 className="h-4 w-4" /> Manhole / Handhole & Ducts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {manholes.slice(0, 3).map((item) => (
                <div key={item.id} className="rounded-2xl border border-border/70 bg-background/70 p-3 text-sm">
                  <p className="font-semibold">{item.node.name}</p>
                  <p className="text-xs text-muted-foreground">{item.type} • {item.depth} • {item.size}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.connectedDucts} connected ducts • {item.connectedClosures} connected closures • {item.condition}</p>
                </div>
              ))}
              {ducts.map((duct) => (
                <div key={duct.id} className="rounded-2xl border border-border/70 bg-background/70 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{duct.name}</p>
                    <Badge variant="outline">{duct.size}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{duct.route}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{duct.used}/{duct.total} used • {duct.spare} spare • {duct.blocked} blocked</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4">
        <Card {...getClickableCardProps("capacity-planning", "Capacity planning card selected.")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Radar className="h-4 w-4" /> Capacity Planning</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {capacityHotspots.map((hotspot) => (
              <div key={hotspot.id} className="rounded-2xl border border-border/70 bg-background/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{hotspot.name}</p>
                    <p className="text-xs text-muted-foreground">{hotspot.used} of {hotspot.total} ports used</p>
                  </div>
                  <Badge variant={hotspot.percent >= 90 ? "danger" : "outline"}>{hotspot.percent}%</Badge>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${hotspot.percent >= 90 ? "bg-red-500" : hotspot.percent >= 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                    style={{ width: `${Math.min(hotspot.percent, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card {...getClickableCardProps("capacity-forecast", "Fiber capacity forecast selected.")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4" /> Fiber Capacity Forecast</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {capacityForecast.map((forecast) => (
              <div key={forecast.id} className="rounded-2xl border border-border/70 bg-background/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{forecast.name}</p>
                  <Badge variant={forecast.monthsToFull <= 3 ? "danger" : forecast.monthsToFull <= 6 ? "warning" : "info"}>
                    {forecast.monthsToFull} month{forecast.monthsToFull === 1 ? "" : "s"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{forecast.note}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card {...getClickableCardProps("optical-heatmap", "Optical power heatmap selected.")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><ThermometerSun className="h-4 w-4" /> Optical Power Heatmap</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {opticalHeatmap.map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-border/70 bg-background/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{entry.name}</p>
                  <Badge variant={entry.status === "critical" ? "danger" : entry.status === "weak" ? "warning" : entry.status === "slight_loss" ? "info" : "success"}>
                    {entry.rx} dBm
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card {...getClickableCardProps("cable-utilization", "Cable utilization heatmap selected.")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Cable className="h-4 w-4" /> Cable Utilization Heatmap</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {cableUtilization.map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-border/70 bg-background/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{entry.name}</p>
                  <Badge variant={entry.utilizationPercent >= 85 ? "danger" : entry.utilizationPercent >= 60 ? "warning" : "success"}>
                    {entry.utilizationPercent}%
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {entry.used} used • {entry.reserved} reserved • {Math.max(entry.total - entry.used - entry.reserved, 0)} available
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card {...getClickableCardProps("time-machine", "Time machine and route history selected.")}>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base"><CalendarClock className="h-4 w-4" /> Time Machine & Route History</CardTitle>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "today", label: "Today" },
                { key: "last_month", label: "Last month" },
                { key: "last_year", label: "Last year" },
                { key: "future", label: "Future" },
                { key: "construction", label: "Construction" },
              ].map((option) => (
                <Button
                  key={option.key}
                  type="button"
                  size="sm"
                  variant={timeView === option.key ? "default" : "outline"}
                  onClick={() => setTimeView(option.key as typeof timeView)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Current view: {timeView.replace("_", " ")}</p>
            {routeHistory.length > 0 ? routeHistory.map((entry) => (
              <div key={entry.version} className="rounded-2xl border border-border/70 bg-background/70 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{entry.version}</p>
                  <Button type="button" size="sm" variant="outline" onClick={() => toast.info(`${entry.version} restore placeholder ready for backend versioning.`)}>
                    Restore
                  </Button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{entry.summary}</p>
                <p className="mt-1 text-xs text-muted-foreground">{entry.date}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground">Select a cable to inspect route versions and historical edits.</p>}
          </CardContent>
        </Card>

        <Card {...getClickableCardProps("technician-tracking", "Live technician tracking selected.")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Wrench className="h-4 w-4" /> Live Technician Tracking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {technicians.length > 0 ? technicians.map((tech) => (
              <div key={tech.name} className="rounded-2xl border border-border/70 bg-background/70 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{tech.name}</p>
                  <Badge variant="info">ETA {tech.eta}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{tech.job} • {tech.location} • {tech.completed} completed jobs</p>
              </div>
            )) : <p className="text-sm text-muted-foreground">Assign technicians to customer jobs to surface live field movement here.</p>}
          </CardContent>
        </Card>

        <Card {...getClickableCardProps("ai-route-recommendation", "AI route recommendation panel selected.")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Bot className="h-4 w-4" /> AI Route Recommendation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">Ready for AI-assisted suggestions across shortest path, cheapest path, fewest poles, and restricted-area avoidance.</p>
            <div className="flex flex-wrap gap-2">
              {["Best path", "Cheapest path", "Fewest poles", "Avoid rivers"].map((item) => (
                <Button key={item} type="button" size="sm" variant="outline" onClick={() => toast.info(`${item} recommendation placeholder ready for GIS/AI backend integration.`)}>
                  {item}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card {...getClickableCardProps("projects-photos-offline", "Projects, photos, and offline mode card selected.")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4" /> Projects, Photos & Offline Mode</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {constructionProjects.map((project) => (
              <div key={project.name} className="rounded-2xl border border-border/70 bg-background/70 p-3 text-sm">
                <p className="font-semibold">{project.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{project.completed}/{project.progress.length} phases completed</p>
              </div>
            ))}
            <div className="rounded-2xl border border-border/70 bg-background/70 p-3 text-sm">
              <p className="flex items-center gap-2 font-semibold"><Camera className="h-4 w-4" /> Street view and object photos</p>
              <p className="mt-1 text-xs text-muted-foreground">Use before-install, after-install, and current-condition photo slots on every field object.</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 p-3 text-sm">
              <p className="font-semibold">Offline field mode</p>
              <p className="mt-1 text-xs text-muted-foreground">Area download, deferred sync, and offline editing are prepared as mobile-ready placeholders for backend/device sync.</p>
            </div>
          </CardContent>
        </Card>

        <Card {...getClickableCardProps("export-presentation", "Export and presentation card selected.")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-4 w-4" /> Export & Presentation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">Presentation-ready export structure for investor demos, rollout reviews, and field handovers.</p>
            <div className="flex flex-wrap gap-2">
              {["PDF map pack", "GeoJSON", "CSV", "KML", "PNG print"].map((item) => (
                <Button key={item} type="button" variant="outline" size="sm">
                  <Download className="mr-2 h-3.5 w-3.5" />
                  {item}
                </Button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">Exports are UI-ready placeholders and should be wired to backend/report services for production download jobs.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
