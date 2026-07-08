import { useMemo } from "react";
import { useCustomers } from "@/hooks/api/use-customers";
import { useWorkOrders } from "@/hooks/api/use-inventory";
import { useSplicingActivities } from "@/hooks/api/use-network";
import { formatCurrency, formatDateOrDash, titleCase } from "@/lib/utils";
import { getWorkOrderStatusTone } from "@/lib/isp";
import { ActivityTimeline } from "@/components/field/activity-timeline";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function FieldPage() {
  const activities = useSplicingActivities();
  const workOrders = useWorkOrders();
  const customers = useCustomers();

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
