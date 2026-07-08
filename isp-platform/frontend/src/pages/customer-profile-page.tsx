import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FileText, Router, ShieldCheck, Signal, Ticket, Wallet } from "lucide-react";
import { buildCustomerServiceLabel, formatPlanAndFee, getCustomerPaymentStatus } from "@/lib/isp";
import { formatCurrency, formatDateOrDash, formatDateTimeOrDash, titleCase } from "@/lib/utils";
import { useCustomer } from "@/hooks/api/use-customers";
import { useCustomerTimeline } from "@/hooks/api/use-operations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export function CustomerProfilePage() {
  const { id } = useParams();
  const { data: customer, isLoading, isError } = useCustomer(id);
  const timeline = useCustomerTimeline(id);

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

      <Card>
        <CardHeader>
          <CardTitle>Customer Usage Timeline</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(timeline.data ?? customer.timeline ?? []).map((entry) => (
            <div key={entry.id} className="rounded-2xl border border-border/70 p-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{entry.title}</p>
                <Badge variant="outline">{entry.type.replace(/_/g, " ")}</Badge>
              </div>
              <p className="mt-1 text-muted-foreground">{entry.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">{formatDateTimeOrDash(entry.createdAt)}</p>
              {entry.actor ? <p className="mt-1 text-xs text-muted-foreground">Actor: {entry.actor}</p> : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              KYC / Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>ID Type: {customer.kyc?.idType?.replace(/_/g, " ") ?? "Pending"}</p>
            <p>ID Number: {customer.kyc?.idNumber ?? "Pending"}</p>
            <p>Address proof: {customer.kyc?.addressProof ?? "Pending"}</p>
            <p>Customer photo: {customer.kyc?.customerPhoto ?? "Pending"}</p>
            <Badge variant={customer.kyc?.verificationStatus === "verified" ? "success" : customer.kyc?.verificationStatus === "rejected" ? "danger" : "warning"}>
              {titleCase(customer.kyc?.verificationStatus ?? "pending")}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SLA & Uptime</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 text-sm">
            <div className="rounded-2xl border border-border/70 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Profile</p>
              <p className="mt-1 font-medium">{titleCase(customer.slaMetrics?.profile ?? "standard")}</p>
            </div>
            <div className="rounded-2xl border border-border/70 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Uptime</p>
              <p className="mt-1 font-medium">{customer.slaMetrics?.currentUptime ?? "-"}</p>
            </div>
            <div className="rounded-2xl border border-border/70 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Downtime</p>
              <p className="mt-1 font-medium">{customer.slaMetrics?.downtimeMinutes ?? 0} mins</p>
            </div>
            <div className="rounded-2xl border border-border/70 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Response / Resolution</p>
              <p className="mt-1 font-medium">{customer.slaMetrics?.averageResponseMinutes ?? 0} / {customer.slaMetrics?.averageResolutionMinutes ?? 0} mins</p>
            </div>
            <div className="rounded-2xl border border-border/70 p-3 md:col-span-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">SLA Breach Risk</p>
              <Badge variant={customer.slaMetrics?.breachRisk === "critical" ? "danger" : customer.slaMetrics?.breachRisk === "warning" ? "warning" : "success"}>
                {titleCase(customer.slaMetrics?.breachRisk ?? "normal")}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Documents & Agreements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(customer.documents ?? []).map((document) => (
              <div key={document.id} className="rounded-2xl border border-border/70 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{document.name}</p>
                  <Badge variant={document.status === "available" ? "success" : document.status === "expired" ? "danger" : "warning"}>
                    {document.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                <p className="mt-1 text-muted-foreground">{document.type.replace(/_/g, " ")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTimeOrDash(document.uploadedAt)}</p>
              </div>
            ))}
            {!(customer.documents ?? []).length ? <p className="text-sm text-muted-foreground">No documents captured yet.</p> : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>ONU / Router Asset History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(customer.deviceAssignments ?? []).map((device) => (
              <div key={device.id} className="rounded-2xl border border-border/70 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{device.deviceType.replace(/_/g, " ")}</p>
                  <Badge variant={device.status === "assigned" ? "success" : device.status === "faulty" || device.status === "damaged" ? "danger" : "warning"}>
                    {device.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                <p className="mt-1 text-muted-foreground">{device.model}</p>
                <p>SN: {device.serialNumber}</p>
                <p>MAC: {device.macAddress ?? "Not captured"}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan Upgrade / Downgrade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(customer.planChangeHistory ?? []).map((change) => (
              <div key={change.id} className="rounded-2xl border border-border/70 p-3 text-sm">
                <p className="font-medium">{change.oldPlan} to {change.newPlan}</p>
                <p className="mt-1 text-muted-foreground">{change.paymentAdjustment}</p>
                <p className="mt-1">Difference: {formatCurrency(change.priceDifference)}</p>
                <Badge variant={change.approvalStatus === "approved" ? "success" : change.approvalStatus === "rejected" ? "danger" : "warning"}>
                  {change.approvalStatus}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Suspension / Renewal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(customer.suspensionHistory ?? []).map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-border/70 p-3">
                <p className="font-medium">{entry.reason}</p>
                <p className="mt-1 text-muted-foreground">By {entry.suspendedBy} on {formatDateOrDash(entry.suspensionDate)}</p>
              </div>
            ))}
            {(customer.contractRenewals ?? []).map((renewal) => (
              <div key={renewal.id} className="rounded-2xl border border-border/70 p-3">
                <p className="font-medium">Contract renewal</p>
                <p className="mt-1 text-muted-foreground">{formatDateOrDash(renewal.contractStartDate)} to {formatDateOrDash(renewal.contractEndDate)}</p>
                <p>Account manager: {renewal.accountManager}</p>
                <Badge variant={renewal.renewalStatus === "renewed" ? "success" : renewal.renewalStatus === "expired" ? "danger" : "warning"}>
                  {renewal.renewalStatus}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Feedback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(customer.feedback ?? []).map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-border/70 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{entry.source}</p>
                  <Badge variant={entry.rating >= 4 ? "success" : entry.rating <= 2 ? "danger" : "warning"}>
                    {entry.rating}/5
                  </Badge>
                </div>
                <p className="mt-1 text-muted-foreground">{entry.comment}</p>
                <p className="mt-1">Satisfaction score: {entry.satisfactionScore}</p>
              </div>
            ))}
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
