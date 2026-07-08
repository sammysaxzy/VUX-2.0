import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Router, Signal, Ticket, Wallet } from "lucide-react";
import { buildCustomerServiceLabel, formatPlanAndFee, getCustomerPaymentStatus } from "@/lib/isp";
import { formatCurrency, formatDateOrDash, formatDateTimeOrDash, titleCase } from "@/lib/utils";
import { useCustomer } from "@/hooks/api/use-customers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export function CustomerProfilePage() {
  const { id } = useParams();
  const { data: customer, isLoading, isError } = useCustomer(id);

  if (isLoading) return <PageSkeleton />;

  if (isError || !customer) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-danger">Customer record not available.</CardContent>
      </Card>
    );
  }

  const paymentStatus = getCustomerPaymentStatus(customer);

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/customers">
          <Button variant="outline">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Customers
          </Button>
        </Link>
        <div className="flex flex-wrap gap-2">
          <Badge variant={customer.accountStatus === "active" ? "success" : "warning"}>{titleCase(customer.accountStatus)}</Badge>
          <Badge variant={paymentStatus === "paid" ? "success" : paymentStatus === "overdue" ? "danger" : "warning"}>
            {titleCase(paymentStatus)}
          </Badge>
          <Badge variant={customer.online ? "success" : "danger"}>{customer.online ? "Online" : "Offline"}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{customer.name}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {customer.id} • {formatPlanAndFee(customer)}
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[1.2fr_0.9fr]">
          <div className="grid gap-4 md:grid-cols-2">
            <DetailCard title="Contact">
              <p>{customer.phone}</p>
              <p>{customer.email}</p>
              <p>{buildCustomerServiceLabel(customer)}</p>
              <p>Customer since: {formatDateOrDash(customer.customerSince)}</p>
            </DetailCard>
            <DetailCard title="Commercial">
              <p>Plan: {customer.planName ?? "Unassigned"}</p>
              <p>Monthly fee: {formatCurrency(customer.monthlyFee ?? 0)}</p>
              <p>Outstanding balance: {formatCurrency(customer.balance ?? 0)}</p>
              <p>Next renewal: {formatDateOrDash(customer.nextInvoiceDate)}</p>
            </DetailCard>
            <DetailCard title="Installation">
              <p>Status: {titleCase(customer.installStatus ?? "pending")}</p>
              <p>Assigned technician: {customer.assignedEngineer ?? "Unassigned"}</p>
              <p>Install date: {formatDateOrDash(customer.installDate)}</p>
              <p>Service location: {customer.serviceLocation ?? customer.address}</p>
            </DetailCard>
            <DetailCard title="Network Assignment">
              <p>MST: {customer.mstId ?? "Not mapped"}</p>
              <p>Splitter port: {customer.splitterPort ?? "Not assigned"}</p>
              <p>Fibre core: {customer.fibreCoreId ?? "Not assigned"}</p>
              <p>PPPoE: {customer.pppoeUsername ?? "Not assigned"}</p>
            </DetailCard>
          </div>
          <div className="space-y-3">
            <div className="rounded-2xl border border-border/70 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">ONU & Router</p>
              <div className="mt-3 space-y-2 text-sm">
                <p className="flex items-center gap-2">
                  <Router className="h-4 w-4 text-primary" />
                  {customer.onuVendor ?? "ONU"} {customer.onuModel ?? ""}
                </p>
                <p>ONU Serial: {customer.onuSerial}</p>
                <p>ONU MAC: {customer.onuMac ?? "Not captured"}</p>
                <p>Router: {customer.routerBrand ?? "Not captured"} {customer.routerModel ?? ""}</p>
                <p>Router MAC: {customer.routerMac ?? "Not captured"}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-border/70 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Optical & Connectivity</p>
              <div className="mt-3 space-y-2 text-sm">
                <p className="flex items-center gap-2">
                  <Signal className="h-4 w-4 text-info" /> RX {customer.rxSignal} dBm / TX {customer.txSignal} dBm
                </p>
                <p>OLT / PON: {customer.oltName} / {customer.ponPort}</p>
                <p>Last seen: {formatDateTimeOrDash(customer.lastSeenAt)}</p>
                <p>Uptime: {customer.uptimeMinutes ? `${customer.uptimeMinutes} mins` : "Not available"}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-border/70 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Billing Reference</p>
              <div className="mt-3 space-y-2 text-sm">
                <p className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-success" />
                  Last payment: {formatDateOrDash(customer.lastPaymentDate)}
                </p>
                <p>Payment reference: {customer.paymentReference ?? "Pending gateway reference"}</p>
                <p>Paystack status: backend key and webhook still required for live checkout.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-primary" />
              Account History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(customer.history ?? []).map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-border/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{entry.title}</p>
                  <Badge variant="outline">{titleCase(entry.type)}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{entry.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">{formatDateTimeOrDash(entry.createdAt)}</p>
              </div>
            ))}
            {!(customer.history ?? []).length ? <p className="text-sm text-muted-foreground">No activity history captured yet.</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operational Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(customer.notes ?? []).map((note) => (
              <div key={note.id} className="rounded-2xl border border-border/70 p-3">
                <p className="font-medium">{note.author}</p>
                <p className="mt-1 text-sm text-muted-foreground">{note.message}</p>
                <p className="mt-2 text-xs text-muted-foreground">{formatDateTimeOrDash(note.createdAt)}</p>
              </div>
            ))}
            {!(customer.notes ?? []).length ? <p className="text-sm text-muted-foreground">No notes recorded yet.</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Installation Records</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(customer.installationRecords ?? []).map((record) => (
              <div key={record.id} className="rounded-2xl border border-border/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{record.title}</p>
                  <Badge variant={record.status === "completed" ? "success" : "warning"}>{titleCase(record.status)}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Technician: {record.technician}</p>
                <p className="text-sm text-muted-foreground">Scheduled: {formatDateOrDash(record.scheduledAt)}</p>
                <p className="text-sm text-muted-foreground">Completed: {formatDateOrDash(record.completedAt)}</p>
                <p className="mt-2 text-xs text-muted-foreground">{record.materials.join(", ")}</p>
              </div>
            ))}
            {!(customer.installationRecords ?? []).length ? <p className="text-sm text-muted-foreground">No installation records captured yet.</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/70 p-4 text-sm">
      <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
