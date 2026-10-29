import { useMemo, useState } from "react";
import { useCustomers } from "@/hooks/api/use-customers";
import { useCompleteWorkOrder, useWorkOrders } from "@/hooks/api/use-inventory";
import { useSplicingActivities } from "@/hooks/api/use-network";
import { formatCurrency, formatDateOrDash, titleCase } from "@/lib/utils";
import { getWorkOrderStatusTone } from "@/lib/isp";
import { ActivityTimeline } from "@/components/field/activity-timeline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function FieldPage() {
  const [completionTarget, setCompletionTarget] = useState<number | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const activities = useSplicingActivities();
  const workOrders = useWorkOrders();
  const customers = useCustomers();
  const completeWorkOrder = useCompleteWorkOrder();

  const stats = useMemo(() => {
    const list = workOrders.data ?? [];
    return {
      pending: list.filter((entry) => entry.status === "draft" || entry.status === "scheduled").length,
      ongoing: list.filter((entry) => entry.status === "in_progress").length,
      completed: list.filter((entry) => entry.status === "completed").length,
      escalated: list.filter((entry) => entry.priority === "critical" || entry.approval_status === "pending").length,
    };
  }, [workOrders.data]);

  if (activities.isLoading || workOrders.isLoading || customers.isLoading || !activities.data) return <PageSkeleton />;

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold">Technician & Field Operations</h1>
        <p className="text-sm text-muted-foreground">
          Coordinate installations, repairs, preventive maintenance, materials used, and engineer accountability.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Pending Jobs" value={`${stats.pending}`} subtitle="Draft or scheduled tasks awaiting execution" />
        <MetricCard title="Ongoing Jobs" value={`${stats.ongoing}`} subtitle="Jobs currently in field or NOC handling" />
        <MetricCard title="Completed Jobs" value={`${stats.completed}`} subtitle="Finished tasks with operational closure" />
        <MetricCard title="Escalated / Approval" value={`${stats.escalated}`} subtitle="Critical tasks or stock approvals requiring attention" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Work Orders</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Customer / Site</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Materials</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(workOrders.data ?? []).map((workOrder) => (
                  <TableRow key={workOrder.id}>
                    <TableCell>
                      <p className="font-medium">{workOrder.title}</p>
                      <p className="text-xs text-muted-foreground">{workOrder.work_order_code}</p>
                    </TableCell>
                    <TableCell className="capitalize">{workOrder.work_type}</TableCell>
                    <TableCell>
                      <p>{workOrder.customer_name ?? "Internal operation"}</p>
                      <p className="text-xs text-muted-foreground">{workOrder.service_address ?? "No site captured"}</p>
                    </TableCell>
                    <TableCell>{formatDateOrDash(workOrder.due_date ?? workOrder.scheduled_at)}</TableCell>
                    <TableCell>
                      <p>{workOrder.materials.length} material lines</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(workOrder.materials.reduce((sum, material) => sum + material.total_cost, 0))}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={getWorkOrderStatusTone(workOrder)}>{titleCase(workOrder.status)}</Badge>
                        <Badge variant={workOrder.priority === "critical" ? "danger" : "outline"}>{titleCase(workOrder.priority ?? "medium")}</Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!workOrders.data?.length ? (
                  <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No work orders yet. Create one from Inventory to start tracking field jobs.</TableCell></TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Engineer Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityTimeline activities={activities.data} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mobile / Field-Friendly View</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(workOrders.data ?? []).slice(0, 6).map((workOrder) => (
            <div key={workOrder.id} className="rounded-2xl border border-border/70 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{workOrder.title}</p>
                <Badge variant={getWorkOrderStatusTone(workOrder)}>{titleCase(workOrder.status)}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{workOrder.customer_name ?? "Internal job"}</p>
              <p className="text-sm text-muted-foreground">{workOrder.service_address ?? "Field location pending"}</p>
              <div className="mt-3 grid gap-2 text-sm">
                <p>Assigned technician: {workOrder.assigned_engineer_user_id ? `User ${workOrder.assigned_engineer_user_id}` : "Pending assignment"}</p>
                <p>Materials: {workOrder.materials.length} lines</p>
                <p>Photos: {(workOrder.photos ?? []).length} uploaded</p>
                <p>Notes: {workOrder.notes ? "Available" : "Pending update"}</p>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {workOrder.approval_status === "pending" ? <Badge variant="warning">Usage approval pending</Badge> : null}
                {workOrder.status !== "completed" && workOrder.status !== "cancelled" ? (
                  <Button size="sm" disabled={completeWorkOrder.isPending} onClick={() => { setCompletionTarget(workOrder.id); setCompletionNotes(workOrder.completion_notes ?? ""); }}>
                    Mark complete
                  </Button>
                ) : <span className="text-xs text-muted-foreground">{workOrder.status === "completed" ? "Job closed" : "Job cancelled"}</span>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog
        open={completionTarget !== null}
        title="Complete work order"
        description="Record a short field note before closing this job. Planned material quantities will be submitted as used unless edited in the work order."
        onOpenChange={(open) => { if (!open && !completeWorkOrder.isPending) setCompletionTarget(null); }}
      >
        <form className="space-y-4" onSubmit={(event) => {
          event.preventDefault();
          if (completionTarget === null) return;
          completeWorkOrder.mutate({ workOrderId: completionTarget, notes: completionNotes }, {
            onSuccess: () => setCompletionTarget(null),
          });
        }}>
          <label className="block space-y-2 text-sm font-medium">
            Completion notes
            <Textarea value={completionNotes} onChange={(event) => setCompletionNotes(event.target.value)} placeholder="Work completed, signal reading, equipment installed, or follow-up needed" />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={completeWorkOrder.isPending} onClick={() => setCompletionTarget(null)}>Cancel</Button>
            <Button type="submit" disabled={completeWorkOrder.isPending}>{completeWorkOrder.isPending ? "Saving…" : "Close work order"}</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

function MetricCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
