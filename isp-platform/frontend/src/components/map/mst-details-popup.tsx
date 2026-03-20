import type { NetworkNode } from "@/types";
import { SplitterGrid } from "@/components/map/splitter-grid";
import { Badge } from "@/components/ui/badge";

type MSTDetailsPopupProps = {
  node: NetworkNode;
};

export function MSTDetailsPopup({ node }: MSTDetailsPopupProps) {
  const usedPorts = node.splitterPorts?.filter((port) => port.status === "used").length ?? 0;
  const totalPorts = node.splitterPorts?.length ?? 0;
  const freePorts = Math.max(totalPorts - usedPorts, 0);
  const utilization = totalPorts > 0 ? Math.round((usedPorts / totalPorts) * 100) : 0;
  const capacityVariant = utilization >= 100 ? "danger" : utilization >= 70 ? "warning" : "success";
  const utilizationBarClass =
    utilization >= 100 ? "bg-danger" : utilization >= 70 ? "bg-warning" : "bg-success";

  return (
    <div className="w-[340px] space-y-3 text-xs">
      <div className="rounded-xl border border-border/70 bg-background/60 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="text-sm font-semibold">{node.name}</p>
            <p className="text-[11px] text-muted-foreground">MST ID: {node.id}</p>
          </div>
          <Badge variant={capacityVariant}>{utilization}% used</Badge>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Coordinates: {node.location.lat.toFixed(5)}, {node.location.lng.toFixed(5)}
        </p>
      </div>

      {node.splitterType ? (
        <div className="rounded-xl border border-border/70 bg-background/60 p-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold">Splitter {node.splitterType}</p>
            <Badge variant="outline">{totalPorts} ports</Badge>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
            <div className="rounded-lg border border-border/60 bg-card/70 p-2 text-center">
              <p className="text-muted-foreground">Used</p>
              <p className="text-sm font-semibold text-danger">{usedPorts}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-card/70 p-2 text-center">
              <p className="text-muted-foreground">Free</p>
              <p className="text-sm font-semibold text-success">{freePorts}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-card/70 p-2 text-center">
              <p className="text-muted-foreground">Util</p>
              <p className="text-sm font-semibold">{utilization}%</p>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted/70">
            <div className={`h-full rounded-full ${utilizationBarClass}`} style={{ width: `${utilization}%` }} />
          </div>
        </div>
      ) : null}

      {node.splitterPorts ? <SplitterGrid ports={node.splitterPorts} clients={node.clients} /> : null}
    </div>
  );
}
