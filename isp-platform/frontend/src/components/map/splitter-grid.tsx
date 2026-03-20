import type { MSTClient, SplitterPort } from "@/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type SplitterGridProps = {
  ports: SplitterPort[];
  clients?: MSTClient[];
};

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

export function SplitterGrid({ ports, clients = [] }: SplitterGridProps) {
  const used = ports.filter((port) => port.status === "used").length;
  const free = Math.max(ports.length - used, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Splitter Ports</p>
        <div className="flex items-center gap-1.5">
          <Badge variant="danger">{used} used</Badge>
          <Badge variant="success">{free} free</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {ports.map((port) => {
          const linkedClient = clients.find((client) => client.splitterPort === port.port);
          const coreColor = linkedClient?.fiberCore ? coreColorMap[linkedClient.fiberCore.toLowerCase()] : undefined;
          return (
            <div
              key={port.port}
              className={cn(
                "space-y-1.5 rounded-xl border p-2 text-xs transition hover:-translate-y-0.5",
                port.status === "used" ? "border-danger/45 bg-danger/10 shadow-[0_8px_24px_-18px_rgba(239,68,68,0.65)]" : "border-success/45 bg-success/10",
              )}
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold">Port {port.port}</p>
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    port.status === "used" ? "bg-danger ring-2 ring-danger/25" : "bg-success ring-2 ring-success/25",
                  )}
                />
              </div>
              <p className={cn("text-[11px] font-medium", port.status === "used" ? "text-danger" : "text-success")}>
                {port.status === "used" ? "Occupied" : "Available"}
              </p>

              {linkedClient ? (
                <div className="rounded-lg border border-border/60 bg-background/70 px-1.5 py-1">
                  <p className="truncate text-[11px] text-muted-foreground">{linkedClient.name}</p>
                  <div className="mt-1 flex items-center gap-1">
                    <span
                      className="h-2.5 w-2.5 rounded-full border border-black/15"
                      style={{ backgroundColor: coreColor || "#94A3B8" }}
                    />
                    <p className="capitalize text-[11px]">{linkedClient.fiberCore} core</p>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">Ready for assignment</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
