import { useMemo, useState } from "react";
import { Cable, Router } from "lucide-react";
import { useFibreCables, useNetworkNodes } from "@/hooks/api/use-network";
import { FibreViewer } from "@/components/fibre/fibre-viewer";
import { SplitterSelector } from "@/components/allocation/splitter-selector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export function InfrastructurePage() {
  const { data: nodes, isLoading: nodeLoading } = useNetworkNodes();
  const { data: cables, isLoading: cableLoading } = useFibreCables();
  const [selectedMstId, setSelectedMstId] = useState<string>("");
  const [selectedPort, setSelectedPort] = useState<number>();
  const [selectedCoreId, setSelectedCoreId] = useState<string>();

  const msts = useMemo(() => (nodes ?? []).filter((node) => node.type === "mst"), [nodes]);
  const selectedMst = msts.find((mst) => mst.id === selectedMstId);
  const allCores = useMemo(() => (cables ?? []).flatMap((cable) => cable.cores), [cables]);

  if (nodeLoading || cableLoading || !nodes || !cables) return <PageSkeleton />;

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
    </div>
  );
}
