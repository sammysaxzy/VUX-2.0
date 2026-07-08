import {
  useCapacityPlanning,
  useEquipmentLifecycle,
  useFiberCoreManagement,
  useGisDistanceEstimates,
  useIpamOverview,
  useNetworkTopology,
} from "@/hooks/api/use-operations";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

export function NetworkIntelligencePage() {
  const topology = useNetworkTopology();
  const capacity = useCapacityPlanning();
  const gis = useGisDistanceEstimates();
  const fiberCore = useFiberCoreManagement();
  const ipam = useIpamOverview();
  const lifecycle = useEquipmentLifecycle();

  if (
    topology.isLoading ||
    capacity.isLoading ||
    gis.isLoading ||
    fiberCore.isLoading ||
    ipam.isLoading ||
    lifecycle.isLoading
  ) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold">Network Intelligence</h1>
        <p className="text-sm text-muted-foreground">
          Topology tracing, capacity planning, GIS estimation, core visibility, IPAM, and equipment lifecycle for a commercial ISP environment.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Topology View</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-7">
            {(topology.data?.path ?? []).map((node) => (
              <div key={node.id} className="rounded-2xl border border-border/70 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{node.layer.replace(/_/g, " ")}</p>
                <p className="mt-2 font-medium">{node.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{node.metric ?? "No metric"}</p>
                <Badge
                  className="mt-3"
                  variant={node.status === "fault" ? "danger" : node.status === "warning" ? "warning" : "success"}
                >
                  {node.status}
                </Badge>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm">
            <p className="font-medium">Fault domain</p>
            <p className="mt-1 text-muted-foreground">{topology.data?.faultDomain ?? "No active traced fault."}</p>
            <p className="mt-2">Impacted customers: <span className="font-semibold">{topology.data?.impactedCustomers ?? 0}</span></p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Capacity Planning</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(capacity.data ?? []).map((item) => (
              <div key={item.id} className="rounded-2xl border border-border/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.type.replace(/_/g, " ")}</p>
                  </div>
                  <Badge variant={item.utilizationPercent >= 85 ? "danger" : item.utilizationPercent >= 70 ? "warning" : "success"}>
                    {item.utilizationPercent}%
                  </Badge>
                </div>
                <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
                  <p>Threshold: <span className="font-medium">{item.thresholdPercent}%</span></p>
                  <p>Available units: <span className="font-medium">{item.availableUnits}</span></p>
                  <p>Forecast: <span className="font-medium">{item.forecastDaysToExhaustion} days</span></p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{item.recommendation}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>GIS & Distance Estimation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(gis.data ?? []).map((estimate) => (
              <div key={`${estimate.customerName}-${estimate.mstName}`} className="rounded-2xl border border-border/70 p-4 text-sm">
                <p className="font-medium">{estimate.customerName}</p>
                <p className="mt-1 text-muted-foreground">{estimate.closureName} → {estimate.mstName}</p>
                <p className="mt-2">Closure to MST: {estimate.distanceClosureToMstMeters} m</p>
                <p>MST to customer: {estimate.distanceMstToCustomerMeters} m</p>
                <p>Estimated cable: {estimate.estimatedCableMeters} m</p>
                <p>Estimated install cost: {formatCurrency(estimate.estimatedInstallationCost)}</p>
                <p className="mt-1 text-muted-foreground">Nearest MST: {estimate.nearestAvailableMst}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Fiber Core Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(fiberCore.data ?? []).map((entry) => (
              <div key={entry.cableName} className="rounded-2xl border border-border/70 p-4 text-sm">
                <p className="font-medium">{entry.cableName}</p>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <p>Core count: {entry.coreCount}</p>
                  <p>Used: {entry.usedCores}</p>
                  <p>Spare: {entry.spareCores}</p>
                  <p>Reserved: {entry.reservedCores}</p>
                  <p>Damaged: {entry.damagedCores}</p>
                  <p>Splice history: {entry.spliceHistoryCount}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>IP Address Management</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Segment</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Subnet</TableHead>
                  <TableHead>Allocated</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(ipam.data ?? []).map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <p className="font-medium">{entry.segment}</p>
                      <p className="text-xs text-muted-foreground">{entry.vlanId ? `VLAN ${entry.vlanId}` : "No VLAN"}</p>
                    </TableCell>
                    <TableCell>{entry.type.replace(/_/g, " ")}</TableCell>
                    <TableCell>{entry.subnet}</TableCell>
                    <TableCell>{entry.allocated}</TableCell>
                    <TableCell>{entry.available}</TableCell>
                    <TableCell>
                      <Badge variant={entry.status === "critical" ? "danger" : entry.status === "warning" ? "warning" : "success"}>
                        {entry.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Equipment Lifecycle</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {(lifecycle.data ?? []).map((asset) => (
            <div key={asset.id} className="rounded-2xl border border-border/70 p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{asset.assetName}</p>
                  <p className="text-muted-foreground">{asset.assetType}</p>
                </div>
                <Badge variant={asset.depreciationStatus === "end_of_life" ? "danger" : asset.depreciationStatus === "mid_life" ? "warning" : "success"}>
                  {asset.depreciationStatus.replace(/_/g, " ")}
                </Badge>
              </div>
              <p className="mt-3">Purchase: {new Date(asset.purchaseDate).toLocaleDateString()}</p>
              <p>Install: {asset.installationDate ? new Date(asset.installationDate).toLocaleDateString() : "Pending"}</p>
              <p>Warranty end: {asset.warrantyEndDate ? new Date(asset.warrantyEndDate).toLocaleDateString() : "Unknown"}</p>
              <p className="mt-2 text-muted-foreground">{asset.replacementSchedule}</p>
              <div className="mt-3 space-y-1">
                {asset.maintenanceHistory.map((item) => (
                  <p key={item} className="text-muted-foreground">{item}</p>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
