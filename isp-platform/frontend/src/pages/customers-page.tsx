import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { hasPermission } from "@/lib/permissions";
import { buildCustomerServiceLabel, getCustomerPaymentStatus } from "@/lib/isp";
import { formatCurrency } from "@/lib/utils";
import type { Customer } from "@/types";
import { useCustomers, useDeleteCustomer, useExportCustomers, useSaveCustomer } from "@/hooks/api/use-customers";
import { useFibreCables, useNetworkNodes } from "@/hooks/api/use-network";
import { useAppStore, useTenantId } from "@/store/app-store";
import { CustomerForm } from "@/components/customers/customer-form";
import { CustomerTable } from "@/components/customers/customer-table";
import { ExportButton } from "@/components/import-export/export-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { CUSTOMER_EXPORT_SCHEMA } from "@/features/import-export/schema";
import { downloadBlob, mapCustomersToExportRows, normalizeExportBlob } from "@/features/import-export/utils";

export function CustomersPage() {
  const tenantId = useTenantId();
  const user = useAppStore((state) => state.user);
  const { data: customers, isLoading: customerLoading } = useCustomers();
  const { data: nodes, isLoading: nodesLoading } = useNetworkNodes();
  const { data: cables, isLoading: cablesLoading } = useFibreCables();
  const saveCustomer = useSaveCustomer();
  const deleteCustomer = useDeleteCustomer();
  const exportCustomersMutation = useExportCustomers();
  const [openDrawer, setOpenDrawer] = useState(false);
  const [activeCustomer, setActiveCustomer] = useState<Customer | undefined>();
  const canViewCustomers = hasPermission(user, "view_customers");
  const canDeleteCustomer = hasPermission(user, "delete_customer");

  const stats = useMemo(() => {
    const list = customers ?? [];
    const overdue = list.filter((entry) => getCustomerPaymentStatus(entry) === "overdue");
    const scheduled = list.filter((entry) => entry.installStatus === "scheduled");
    const active = list.filter((entry) => entry.accountStatus === "active").length;
    const online = list.filter((entry) => entry.online).length;
    return {
      total: list.length,
      active,
      online,
      overdueCount: overdue.length,
      overdueRevenue: overdue.reduce((sum, entry) => sum + (entry.balance ?? 0), 0),
      scheduledInstalls: scheduled.length,
      technicianCoverage: new Set(list.map((entry) => entry.assignedEngineer).filter(Boolean)).size,
    };
  }, [customers]);

  if (!canViewCustomers) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Your permission profile does not allow access to customer records.
        </CardContent>
      </Card>
    );
  }

  if (customerLoading || nodesLoading || cablesLoading || !nodes || !cables || !customers) {
    return <PageSkeleton />;
  }

  const handleExportCustomers = async () => {
    const blob = await exportCustomersMutation.mutateAsync();
    const normalized = await normalizeExportBlob(blob, CUSTOMER_EXPORT_SCHEMA, mapCustomersToExportRows(customers));
    downloadBlob("customers-export.csv", normalized);
  };

  const priorityCustomers = [...customers]
    .filter((customer) => getCustomerPaymentStatus(customer) !== "paid" || !customer.online)
    .slice(0, 4);

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">CRM & Customer Operations</h1>
          <p className="text-sm text-muted-foreground">
            Manage subscriber profiles, installation readiness, payment posture, and field ownership from one workspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportButton
            label="Export CRM"
            isLoading={exportCustomersMutation.isPending}
            onClick={() => void handleExportCustomers()}
          />
          <Button
            onClick={() => {
              setActiveCustomer(undefined);
              setOpenDrawer(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add Customer
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard title="Total Customers" value={`${stats.total}`} subtitle="All active tenant customer records" />
        <MetricCard title="Active Accounts" value={`${stats.active}`} subtitle="Eligible for service and billing" tone="success" />
        <MetricCard title="Online Now" value={`${stats.online}`} subtitle="Reachable endpoints at last refresh" tone="info" />
        <MetricCard title="Overdue Accounts" value={`${stats.overdueCount}`} subtitle={formatCurrency(stats.overdueRevenue)} tone="danger" />
        <MetricCard title="Scheduled Installs" value={`${stats.scheduledInstalls}`} subtitle="Pending field execution" tone="warning" />
        <MetricCard title="Technicians in Play" value={`${stats.technicianCoverage}`} subtitle="Assigned install or support owners" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Customer Registry</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerTable
              customers={customers}
              onSelect={(customer) => {
                setActiveCustomer(customer);
                setOpenDrawer(true);
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attention Queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {priorityCustomers.map((customer) => {
              const paymentStatus = getCustomerPaymentStatus(customer);
              return (
                <div key={customer.id} className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">{buildCustomerServiceLabel(customer)}</p>
                    </div>
                    <Badge variant={!customer.online ? "danger" : paymentStatus === "overdue" ? "warning" : "outline"}>
                      {!customer.online ? "Offline" : paymentStatus}
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                    <p>Plan: {customer.planName ?? "Unassigned"}</p>
                    <p>Technician: {customer.assignedEngineer ?? "Unassigned"}</p>
                    <p>Balance: {formatCurrency(customer.balance ?? 0)}</p>
                  </div>
                </div>
              );
            })}
            {priorityCustomers.length === 0 ? (
              <p className="text-sm text-muted-foreground">All customers are current and connected.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Drawer
        open={openDrawer}
        onOpenChange={setOpenDrawer}
        title={activeCustomer ? "Edit Customer Record" : "Add Customer Record"}
        description="Capture customer identity, service details, billing readiness, installation ownership, and optical assignment."
      >
        <CustomerForm
          initial={activeCustomer}
          tenantId={tenantId}
          nodes={nodes}
          cables={cables}
          submitting={saveCustomer.isPending}
          deleting={canDeleteCustomer ? deleteCustomer.isPending : false}
          onSubmit={(payload) => {
            saveCustomer.mutate(payload, {
              onSuccess: () => {
                setOpenDrawer(false);
                setActiveCustomer(undefined);
              },
            });
          }}
          onDelete={(customerId) => {
            deleteCustomer.mutate(customerId, {
              onSuccess: () => {
                setOpenDrawer(false);
                setActiveCustomer(undefined);
              },
            });
          }}
        />
      </Drawer>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  tone = "default",
}: {
  title: string;
  value: string;
  subtitle: string;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "danger"
          ? "text-danger"
          : tone === "info"
            ? "text-info"
            : "text-foreground";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-semibold ${toneClass}`}>{value}</div>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
