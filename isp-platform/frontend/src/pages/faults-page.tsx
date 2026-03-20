import { useState } from "react";
import { AlertTriangle, PlusCircle } from "lucide-react";
import { useFaults, useReportFault } from "@/hooks/api/use-faults";
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
  const [openDialog, setOpenDialog] = useState(false);
  const [focusedCableId, setFocusedCableId] = useState<string>();

  if (faultLoading || nodesLoading || cableLoading || !faults || !nodes || !cables) return <PageSkeleton />;

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Fault Management</h1>
          <p className="text-sm text-muted-foreground">Track and report outages with visual impact mapping.</p>
        </div>
        <Button onClick={() => setOpenDialog(true)}>
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
              <button
                key={fault.id}
                className="w-full rounded-xl border border-border/70 bg-background/60 p-3 text-left transition hover:bg-muted/20"
                onClick={() => setFocusedCableId(fault.affectedCableId)}
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium">{fault.title}</p>
                  <Badge variant={fault.severity === "critical" ? "danger" : "warning"}>{fault.severity}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{fault.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatRelativeDate(fault.createdAt)}</p>
              </button>
            ))}
            {faults.length === 0 ? <p className="text-sm text-muted-foreground">No faults reported.</p> : null}
          </CardContent>
        </Card>

        <MapComponent nodes={nodes} cables={cables} highlightedCableId={focusedCableId} className="h-[600px]" />
      </div>

      <FaultReportDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        nodes={nodes}
        cables={cables}
        submitting={reportFault.isPending}
        onSubmit={(payload) => reportFault.mutate(payload)}
      />
    </div>
  );
}
