import { useMemo, useState } from "react";
import { Cable, Router } from "lucide-react";
import { useFibreCables, useNetworkNodes } from "@/hooks/api/use-network";
import { useNocAlerts, useSiteManagement, useUsageAnalytics } from "@/hooks/api/use-operations";
import { FibreViewer } from "@/components/fibre/fibre-viewer";
import { SplitterSelector } from "@/components/allocation/splitter-selector";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export function InfrastructurePage() {
  const { data: nodes, isLoading: nodeLoading } = useNetworkNodes();
  const { data: cables, isLoading: cableLoading } = useFibreCables();
  const sites = useSiteManagement();
  const nocAlerts = useNocAlerts();
  const usageAnalytics = useUsageAnalytics();
  const [selectedMstId, setSelectedMstId] = useState<string>("");
  const [selectedPort, setSelectedPort] = useState<number>();
  const [selectedCoreId, setSelectedCoreId] = useState<string>();

  const msts = useMemo(() => (nodes ?? []).filter((node) => node.type === "mst"), [nodes]);
  const selectedMst = msts.find((mst) => mst.id === selectedMstId);
  const allCores = useMemo(() => (cables ?? []).flatMap((cable) => cable.cores), [cables]);

  if (nodeLoading || cableLoading || !nodes || !cables || sites.isLoading || nocAlerts.isLoading || usageAnalytics.isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold">Infrastructure & Core Allocation</h1>
        <p className="text-sm text-muted-foreground">Visual splitter and fibre core assignment workspace.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Router className="h-4 w-4 text-primary" />
            Splitter Allocation
          </CardTitle>
          <Badge variant="outline">{msts.length} MST boxes</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-sm">
            <Select value={selectedMstId} onChange={(event) => setSelectedMstId(event.target.value)}>
              <option value="">Select MST</option>
              {msts.map((mst) => (
                <option key={mst.id} value={mst.id}>
                  {mst.name} ({mst.splitterType})
                </option>
              ))}
            </Select>
          </div>
          {selectedMst?.splitterPorts ? (
            <SplitterSelector ports={selectedMst.splitterPorts} selectedPort={selectedPort} onSelect={setSelectedPort} />
          ) : (
            <p className="text-sm text-muted-foreground">Select an MST to view port grid.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cable className="h-4 w-4 text-primary" />
            Fibre Core Inventory
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FibreViewer cores={allCores} selectedCoreId={selectedCoreId} onSelect={setSelectedCoreId} />
          <p className="text-sm text-muted-foreground">
            Selected Port: {selectedPort ?? "-"} | Selected Core: {selectedCoreId ?? "-"}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>POP / Site Management</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Power</TableHead>
                  <TableHead>Battery / Inverter</TableHead>
                  <TableHead>Uplink</TableHead>
                  <TableHead>Equipment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(sites.data ?? []).map((site) => (
                  <TableRow key={site.id}>
                    <TableCell>
                      <p className="font-medium">{site.name}</p>
                      <p className="text-xs text-muted-foreground">{site.serviceAreaName}</p>
                    </TableCell>
                    <TableCell>{site.type.replace(/_/g, " ")}</TableCell>
                    <TableCell>
                      <Badge variant={site.powerStatus === "critical" ? "danger" : site.powerStatus === "warning" ? "warning" : "success"}>
                        {site.powerStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>{site.batteryStatus} / {site.inverterStatus}</TableCell>
                    <TableCell>{site.uplink}</TableCell>
                    <TableCell>{site.equipment.slice(0, 2).join(", ")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>NOC Monitoring</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(nocAlerts.data ?? []).map((alert) => (
                <div key={alert.id} className="rounded-2xl border border-border/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{alert.title}</p>
                    <Badge variant={alert.severity === "critical" ? "danger" : alert.severity === "warning" ? "warning" : "outline"}>
                      {alert.severity}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{alert.description}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{alert.source}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bandwidth & Capacity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="rounded-2xl border border-border/70 p-3">Total capacity: <span className="font-semibold">{usageAnalytics.data?.totalCapacityMbps ?? 0} Mbps</span></p>
              <p className="rounded-2xl border border-border/70 p-3">Peak usage: <span className="font-semibold">{usageAnalytics.data?.peakUsageMbps ?? 0} Mbps</span></p>
              <p className="rounded-2xl border border-border/70 p-3">Peak hours: <span className="font-semibold">{usageAnalytics.data?.peakHourWindow ?? "-"}</span></p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
