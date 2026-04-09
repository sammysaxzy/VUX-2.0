import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useRadiusUsers } from "@/hooks/api/use-radius";
import { hasPermission } from "@/lib/permissions";
import type { Customer } from "@/types";
import { useCustomers, useDeleteCustomer, useExportCustomers, useSaveCustomer } from "@/hooks/api/use-customers";
import { useFibreCables, useNetworkNodes } from "@/hooks/api/use-network";
import { useAppStore, useTenantId } from "@/store/app-store";
import { CustomerForm } from "@/components/customers/customer-form";
import { CustomerTable } from "@/components/customers/customer-table";
import { ExportButton } from "@/components/import-export/export-button";
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
  const { data: radiusUsers, isLoading: radiusUsersLoading } = useRadiusUsers();
  const { data: nodes, isLoading: nodesLoading } = useNetworkNodes();
  const { data: cables, isLoading: cablesLoading } = useFibreCables();
  const saveCustomer = useSaveCustomer();
  const deleteCustomer = useDeleteCustomer();
  const exportCustomersMutation = useExportCustomers();
  const [openDrawer, setOpenDrawer] = useState(false);
  const [activeCustomer, setActiveCustomer] = useState<Customer | undefined>();
  const canViewCustomers = hasPermission(user, "view_customers");
  const canDeleteCustomer = hasPermission(user, "delete_customer");

  if (!canViewCustomers) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Your permission profile does not allow access to customer records.
        </CardContent>
      </Card>
    );
  }

  const stats = useMemo(() => {
    const list = customers ?? [];
    return {
      total: list.length,
      active: list.filter((entry) => entry.accountStatus === "active").length,
      online: list.filter((entry) => entry.online).length,
    };
  }, [customers]);

  if (customerLoading || radiusUsersLoading || nodesLoading || cablesLoading || !nodes || !cables || !customers || !radiusUsers) {
    return <PageSkeleton />;
  }

  const linkedPppoeCount = activeCustomer ? radiusUsers.filter((user) => user.customerId === activeCustomer.id).length : 0;

  const handleExportCustomers = async () => {
    const blob = await exportCustomersMutation.mutateAsync();
    const normalized = await normalizeExportBlob(blob, CUSTOMER_EXPORT_SCHEMA, mapCustomersToExportRows(customers));
    downloadBlob("customers-export.csv", normalized);
  };

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">CRM - Customer Management</h1>
          <p className="text-sm text-muted-foreground">Manage customer profiles, MST assignments, and signal health.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportButton
            label="Export"
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

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm">Total Customers</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats.total}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm">Active Accounts</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-success">{stats.active}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm">Online Now</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-info">{stats.online}</CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-5">
          <CustomerTable
            customers={customers}
            onSelect={(customer) => {
              setActiveCustomer(customer);
              setOpenDrawer(true);
            }}
          />
        </CardContent>
      </Card>

      <Drawer
        open={openDrawer}
        onOpenChange={setOpenDrawer}
        title={activeCustomer ? "Edit Customer" : "Add Customer"}
        description="Use structured assignment for splitter port and fibre core."
      >
        <CustomerForm
          initial={activeCustomer}
          tenantId={tenantId}
          nodes={nodes}
          cables={cables}
          linkedPppoeCount={linkedPppoeCount}
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
