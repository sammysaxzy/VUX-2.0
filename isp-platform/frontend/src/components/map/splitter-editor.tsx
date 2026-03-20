import type { MSTClient, SplitterPort, SplitterType } from "@/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

type SplitterEditorProps = {
  splitterType: SplitterType;
  ports: SplitterPort[];
  clients?: MSTClient[];
  onChangeSplitterType: (splitterType: SplitterType) => void;
  onAssignOrEdit: (portNumber: number) => void;
  onRemoveClient: (portNumber: number) => void;
};

const splitterOptions: SplitterType[] = ["1/2", "1/4", "1/8", "1/16"];
const coreColorMap: Record<string, string> = {
  blue: "#0077C8",
  orange: "#FF7A00",
  green: "#00A650",
  brown: "#8C5A2B",
  slate: "#6A6F76",
  white: "#F4F7FA",
  red: "#E6484A",
  black: "#1F2328",
  yellow: "#FFC93D",
  violet: "#7C5DFA",
  rose: "#E95A9B",
  aqua: "#00B7B3",
};

export function SplitterEditor({
  splitterType,
  ports,
  clients = [],
  onChangeSplitterType,
  onAssignOrEdit,
  onRemoveClient,
}: SplitterEditorProps) {
  const used = ports.filter((port) => port.status === "used").length;
  const free = Math.max(ports.length - used, 0);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border/70 bg-background/60 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Splitter Configuration</p>
        <div className="flex items-center gap-2">
          <Select value={splitterType} onChange={(event) => onChangeSplitterType(event.target.value as SplitterType)}>
            {splitterOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
          <Badge variant="outline">{ports.length} ports</Badge>
          <Badge variant="danger">{used} used</Badge>
          <Badge variant="success">{free} free</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {ports.map((port) => {
          const linkedClient = clients.find((client) => client.splitterPort === port.port);
          const fiberCore = linkedClient?.fiberCore ?? port.assignedCoreColor;
          const coreColor = fiberCore ? coreColorMap[fiberCore.toLowerCase()] : undefined;

          return (
            <div
              key={port.port}
              className={cn(
                "space-y-2 rounded-xl border p-2 text-xs transition hover:-translate-y-0.5",
                port.status === "used" ? "border-danger/45 bg-danger/10" : "border-success/45 bg-success/10",
              )}
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold">Port {port.port}</p>
                <span className={cn("h-2.5 w-2.5 rounded-full", port.status === "used" ? "bg-danger" : "bg-success")} />
              </div>

              {linkedClient ? (
                <div className="space-y-1 rounded-lg border border-border/60 bg-background/70 p-1.5">
                  <p className="truncate text-[11px]">{linkedClient.name}</p>
                  <div className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-full border border-black/15" style={{ backgroundColor: coreColor || "#94A3B8" }} />
                    <p className="text-[11px] capitalize">{fiberCore ?? "-"} core</p>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">No client assigned</p>
              )}

              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" className="h-7 flex-1 px-1.5 text-[11px]" onClick={() => onAssignOrEdit(port.port)}>
                  {linkedClient ? "Edit" : "Assign"}
                </Button>
                {linkedClient ? (
                  <Button size="sm" variant="danger" className="h-7 px-1.5 text-[11px]" onClick={() => onRemoveClient(port.port)}>
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
