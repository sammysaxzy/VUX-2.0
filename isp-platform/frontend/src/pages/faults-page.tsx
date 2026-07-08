import { useMemo, useState } from "react";
import { AlertTriangle, Pencil, PlusCircle, Trash2 } from "lucide-react";
import { useCustomers } from "@/hooks/api/use-customers";
import { useDeleteFault, useFaults, useReportFault, useUpdateFault } from "@/hooks/api/use-faults";
import { useFibreCables, useNetworkNodes } from "@/hooks/api/use-network";
import { getFaultImpact } from "@/lib/isp";
import { formatDateTimeOrDash, titleCase } from "@/lib/utils";
import { FaultReportDialog } from "@/components/faults/fault-report-dialog";
import { MapComponent } from "@/components/map/map-component";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export function FaultsPage() {
  const { data: faults, isLoading: faultLoading } = useFaults();
  const { data: nodes, isLoading: nodesLoading } = useNetworkNodes();
  const { data: cables, isLoading: cableLoading } = useFibreCables();
  const { data: customers, isLoading: customerLoading } = useCustomers();
  const reportFault = useReportFault();
  const updateFault = useUpdateFault();
  const deleteFault = useDeleteFault();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingFault, setEditingFault] = useState<(typeof faults)[number] | null>(null);
  const [focusedCableId, setFocusedCableId] = useState<string>();

  const supportQueue = useMemo(
    () =>
      (customers ?? [])
        .flatMap((customer) =>
          (customer.history ?? [])
            .filter((entry) => entry.type === "support")
            .map((entry) => ({
              id: entry.id,
              customerName: customer.name,
              customerId: customer.id,
              status: entry.status ?? "open",
              title: entry.title,
              description: entry.description,
              createdAt: entry.createdAt,
            })),
        )
        .slice(0, 6),
    [customers],
  );

  if (faultLoading || nodesLoading || cableLoading || customerLoading || !faults || !nodes || !cables || !customers) return <PageSkeleton />;

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Fault Management & Customer Support</h1>
          <p className="text-sm text-muted-foreground">Track outages, assess customer impact, and manage complaint escalation with API-ready support flows.</p>
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

      <div className="grid gap-4 xl:grid-cols-[1.05fr_1.3fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-danger" />
              Open Faults
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {faults.map((fault) => {
              const impactedCustomers = getFaultImpact(fault, customers);
              return (
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
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatDateTimeOrDash(fault.createdAt)}</span>
                      <span>{titleCase(fault.status)}</span>
                      <span>{impactedCustomers.length} affected customers</span>
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
              );
            })}
            {faults.length === 0 ? <p className="text-sm text-muted-foreground">No faults reported.</p> : null}
          </CardContent>
        </Card>

        <MapComponent nodes={nodes} cables={cables} highlightedCableId={focusedCableId} className="h-[600px]" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Complaint Workflow Queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {supportQueue.map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-border/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{entry.title}</p>
                    <p className="text-xs text-muted-foreground">{entry.customerName}</p>
                  </div>
                  <Badge variant={entry.status === "escalated" ? "danger" : entry.status === "resolved" ? "success" : "warning"}>
                    {titleCase(entry.status)}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{entry.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">{formatDateTimeOrDash(entry.createdAt)}</p>
              </div>
            ))}
            {!supportQueue.length ? <p className="text-sm text-muted-foreground">No customer complaint tickets in the current queue.</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>WhatsApp Automation Readiness</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-2xl border border-border/70 p-4">
              <p className="font-medium">Suggested environment variables</p>
              <p className="mt-2 text-muted-foreground">`WHATSAPP_API_BASE_URL`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `SUPPORT_ESCALATION_WEBHOOK`</p>
            </div>
            <div className="rounded-2xl border border-border/70 p-4">
              <p className="font-medium">Workflow</p>
              <p className="mt-2 text-muted-foreground">Receive complaint, validate customer identity, open ticket, route to customer care or NOC, then escalate to management when SLA or severity thresholds are exceeded.</p>
            </div>
          </CardContent>
        </Card>
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
