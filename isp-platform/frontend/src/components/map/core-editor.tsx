
import { useMemo, useState } from "react";
import type { FibreCable } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type CoreEditorProps = {
  cable: FibreCable;
  onSetCoreState: (payload: {
    cableId: string;
    coreId: string;
    status: "free" | "used";
    fromMstId?: string;
    toMstId?: string;
    usagePath?: string;
    assignedToCustomerId?: string;
  }) => void;
};

type CoreAction = "assign" | "free" | "reroute";

export function CoreEditor({ cable, onSetCoreState }: CoreEditorProps) {
  const [action, setAction] = useState<CoreAction>("assign");
  const [coreId, setCoreId] = useState("");
  const [fromEndpoint, setFromEndpoint] = useState(cable.startMstId ?? cable.fromNodeId);
  const [toEndpoint, setToEndpoint] = useState(cable.endMstId ?? cable.toNodeId);
  const [note, setNote] = useState("");

  const freeCores = useMemo(() => cable.cores.filter((core) => core.status === "free"), [cable.cores]);
  const usedCores = useMemo(() => cable.cores.filter((core) => core.status === "used"), [cable.cores]);
  const options = action === "assign" ? freeCores : usedCores;
  const selectedCore = options.find((core) => core.id === coreId);

  return (
    <div className="space-y-2 rounded-xl border border-border/70 bg-background/60 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Core Editor</p>
      <Select value={action} onChange={(event) => setAction(event.target.value as CoreAction)}>
        <option value="assign">Assign Free Core</option>
        <option value="free">Free Used Core</option>
        <option value="reroute">Re-route Used Core</option>
      </Select>
      <Select value={coreId} onChange={(event) => setCoreId(event.target.value)}>
        <option value="">Select core</option>
        {options.map((core) => (
          <option key={core.id} value={core.id}>
            {core.label}
          </option>
        ))}
      </Select>

      {action !== "free" ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Input value={fromEndpoint} onChange={(event) => setFromEndpoint(event.target.value)} placeholder="From (MST/Client)" />
          <Input value={toEndpoint} onChange={(event) => setToEndpoint(event.target.value)} placeholder="To (MST/Client)" />
          <div className="sm:col-span-2">
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Engineering note for this core path" />
          </div>
        </div>
      ) : null}
      <Button
        disabled={!selectedCore}
        onClick={() => {
          if (!selectedCore) return;
          if (action === "free") {
            onSetCoreState({ cableId: cable.id, coreId: selectedCore.id, status: "free" });
            setCoreId("");
            setNote("");
            return;
          }

          const usagePath = note.trim().length
            ? note
            : selectedCore.label + " core is used from " + (fromEndpoint || "-") + " to " + (toEndpoint || "-");

          onSetCoreState({
            cableId: cable.id,
            coreId: selectedCore.id,
            status: "used",
            fromMstId: fromEndpoint,
            toMstId: toEndpoint,
            usagePath,
            assignedToCustomerId: selectedCore.assignedToCustomerId,
          });
          setCoreId("");
          setNote("");
        }}
      >
        {action === "assign" ? "Assign Core" : action === "free" ? "Free Core" : "Apply Re-route"}
      </Button>
    </div>
  );
}
