import type { FibreCore } from "@/types";
import { Badge } from "@/components/ui/badge";

type CoreListProps = {
  cores: FibreCore[];
};

export function CoreList({ cores }: CoreListProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Core Details</p>
      <div className="max-h-56 space-y-2 overflow-auto pr-1">
        {cores.map((core) => (
          <div key={core.id} className="rounded-xl border border-border/70 bg-background/60 p-2.5 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: core.color }} />
                <p className="font-semibold">{core.label}</p>
              </div>
              <Badge variant={core.status === "used" ? "warning" : core.status === "faulty" ? "danger" : "success"}>
                {core.status}
              </Badge>
            </div>
            {core.status === "used" ? (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {core.usagePath || `Used from ${core.fromMstId ?? "-"} to ${core.toMstId ?? "-"}`}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
