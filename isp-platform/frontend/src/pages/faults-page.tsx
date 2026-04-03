import { useState } from "react";
import { AlertTriangle, Pencil, PlusCircle, Trash2 } from "lucide-react";
import { useDeleteFault, useFaults, useReportFault, useUpdateFault } from "@/hooks/api/use-faults";
import { useFibreCables, useNetworkNodes } from "@/hooks/api/use-network";
import { FaultReportDialog } from "@/components/faults/fault-report-dialog";
import { MapComponent } from "@/components/map/map-component";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { formatRelativeDate } from "@/lib/utils";

export function FaultsPage() {
  const { data: faults, isLoading: faultLoading } = useFaults();
  const { data: nodes, isLoading: nodesLoading } = useNetworkNodes();
  const { data: cables, isLoading: cableLoading } = useFibreCables();
  const reportFault = useReportFault();
  const updateFault = useUpdateFault();
  const deleteFault = useDeleteFault();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingFault, setEditingFault] = useState<(typeof faults)[number] | null>(null);
  const [focusedCableId, setFocusedCableId] = useState<string>();

  if (faultLoading || nodesLoading || cableLoading || !faults || !nodes || !cables) return <PageSkeleton />;

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Fault Management</h1>
          <p className="text-sm text-muted-foreground">Track and report outages with visual impact mapping.</p>
        </div>
        <Button
          onClick={() => {
            setEditingFault(null);
            setOpenDialog(true);
          }}
        >
          <PlusCircle className="mr-1 h-4 w-4" />
          Report Fault
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_1.3fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-danger" />
              Open Faults
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {faults.map((fault) => (
              <div key={fault.id} className="rounded-xl border border-border/70 bg-background/60 p-3">
                <button
                  type="button"
                  className="w-full text-left transition hover:bg-muted/20"
                  onClick={() => setFocusedCableId(fault.affectedCableId)}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{fault.title}</p>
                    <Badge variant={fault.severity === "critical" ? "danger" : "warning"}>{fault.severity}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{fault.description}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatRelativeDate(fault.createdAt)}</span>
                    <span>•</span>
                    <span>{fault.status.replace("_", " ")}</span>
                  </div>
                </button>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingFault(fault);
                      setOpenDialog(true);
                    }}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      if (!window.confirm("Are you sure you want to delete this fault?")) return;
                      deleteFault.mutate({ faultId: fault.id });
                      if (focusedCableId === fault.affectedCableId) {
                        setFocusedCableId(undefined);
                      }
                    }}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
            {faults.length === 0 ? <p className="text-sm text-muted-foreground">No faults reported.</p> : null}
          </CardContent>
        </Card>

        <MapComponent nodes={nodes} cables={cables} highlightedCableId={focusedCableId} className="h-[600px]" />
      </div>

      <FaultReportDialog
        open={openDialog}
        onOpenChange={(nextOpen) => {
          setOpenDialog(nextOpen);
          if (!nextOpen) setEditingFault(null);
        }}
        nodes={nodes}
        cables={cables}
        submitting={reportFault.isPending || updateFault.isPending}
        mode={editingFault ? "edit" : "create"}
        initialFault={editingFault ?? undefined}
        onSubmit={(payload) => {
          if (editingFault) {
            updateFault.mutate({ faultId: editingFault.id, update: payload });
            return;
          }
          reportFault.mutate(payload);
        }}
      />
    </div>
  );
}
