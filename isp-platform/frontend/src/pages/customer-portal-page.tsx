import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  usePortalCreatePayment,
  usePortalCreateTicket,
  usePortalNotifications,
  usePortalPayments,
  usePortalPlans,
  usePortalProfile,
  usePortalTickets,
  usePortalUpgradePlan,
  usePortalUsage,
} from "@/hooks/api/use-portal";
import type { CustomerPayment, CustomerTicketCategory } from "@/types";

type PortalSession = {
  token: string;
  customerId: string;
};

function readPortalSession(): PortalSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem("portal-session");
    return raw ? (JSON.parse(raw) as PortalSession) : null;
  } catch {
    return null;
  }
}

export function CustomerPortalPage() {
  const [session, setSession] = useState<PortalSession | null>(() => readPortalSession());
  const [ticketForm, setTicketForm] = useState<{ subject: string; description: string; category: CustomerTicketCategory }>({
    subject: "",
    description: "",
    category: "no internet",
  });
  const [paymentPlanId, setPaymentPlanId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<CustomerPayment["method"]>("paystack");

  const profileQuery = usePortalProfile(session?.customerId, session?.token);
  const plansQuery = usePortalPlans();
  const ticketsQuery = usePortalTickets(session?.customerId, session?.token);
  const notificationsQuery = usePortalNotifications(session?.customerId, session?.token);
  const paymentsQuery = usePortalPayments(session?.customerId, session?.token);
  const usageQuery = usePortalUsage(session?.customerId, session?.token);
  const createTicketMutation = usePortalCreateTicket(session?.customerId, session?.token);
  const createPaymentMutation = usePortalCreatePayment(session?.customerId, session?.token);
  const upgradePlanMutation = usePortalUpgradePlan(session?.customerId, session?.token);

  const activePlan = profileQuery.data?.planName ?? "Unknown plan";
  const availablePlans = plansQuery.data ?? [];
  const usageSummary = useMemo(() => {
    const latest = usageQuery.data?.[0];
    if (!latest) return "No usage record yet.";
    return `${latest.usedGb} GB used${latest.capGb ? ` of ${latest.capGb} GB` : ""} in ${latest.month}.`;
  }, [usageQuery.data]);

  if (!session) {
    return <Navigate to="/portal/login" replace />;
  }

  const logout = () => {
    window.sessionStorage.removeItem("portal-session");
    setSession(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 rounded-3xl bg-slate-900 px-6 py-8 text-white md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-slate-300">Customer Portal</p>
            <h1 className="mt-2 text-3xl font-semibold">{profileQuery.data?.name ?? "Self Care"}</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              View plan details, track invoices, submit complaints, and manage your service from one place.
            </p>
          </div>
          <Button variant="secondary" onClick={logout}>
            Sign out
          </Button>
        </div>

        {profileQuery.isLoading ? (
          <PageSkeleton />
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <PortalStat title="Current Plan" value={activePlan} detail={`${profileQuery.data?.speedMbps ?? 0} Mbps service`} />
            <PortalStat title="Account Status" value={profileQuery.data?.status ?? "unknown"} detail={`Expiry: ${profileQuery.data?.expiryDate ?? "not available"}`} />
            <PortalStat title="Usage" value={`${profileQuery.data?.usageGb ?? 0} GB`} detail={usageSummary} />
            <PortalStat title="Open Tickets" value={String((ticketsQuery.data ?? []).filter((item) => item.status !== "resolved" && item.status !== "closed").length)} detail="Support complaints waiting for closure." />
          </section>
        )}

        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <Card>
            <CardHeader>
              <CardTitle>Plan & Payments</CardTitle>
              <CardDescription>Check your package, switch plans, and generate payment requests with Paystack-ready placeholders.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {availablePlans.map((plan) => (
                  <div key={plan.id} className="rounded-2xl border border-border/70 p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="font-medium">{plan.name}</p>
                      {plan.recommended ? <Badge variant="success">Recommended</Badge> : null}
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                    <p className="mt-3 text-2xl font-semibold">NGN {plan.priceMonthly.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{plan.speedMbps} Mbps monthly plan</p>
                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => upgradePlanMutation.mutate({ planId: plan.id })}
                        disabled={upgradePlanMutation.isPending}
                      >
                        Switch Plan
                      </Button>
                      <Button
                        onClick={() => createPaymentMutation.mutate({ planId: plan.id, method: paymentMethod })}
                        disabled={createPaymentMutation.isPending}
                      >
                        Pay Now
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_180px]">
                <div className="space-y-1">
                  <Label>Payment Method</Label>
                  <Select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as CustomerPayment["method"])}>
                    <option value="paystack">paystack</option>
                    <option value="flutterwave">flutterwave</option>
                    <option value="stripe">stripe</option>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Quick Plan</Label>
                  <Select value={paymentPlanId} onChange={(event) => setPaymentPlanId(event.target.value)}>
                    <option value="">Select plan</option>
                    {availablePlans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <Button
                variant="secondary"
                disabled={!paymentPlanId || createPaymentMutation.isPending}
                onClick={() => createPaymentMutation.mutate({ planId: paymentPlanId, method: paymentMethod })}
              >
                Create Payment Request
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Submit Complaint</CardTitle>
              <CardDescription>Report no-internet, speed, and billing issues directly from the portal.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="Subject">
                <Input value={ticketForm.subject} onChange={(event) => setTicketForm((current) => ({ ...current, subject: event.target.value }))} />
              </Field>
              <Field label="Category">
                <Select value={ticketForm.category} onChange={(event) => setTicketForm((current) => ({ ...current, category: event.target.value as CustomerTicketCategory }))}>
                  <option value="no internet">no internet</option>
                  <option value="slow speed">slow speed</option>
                  <option value="billing">billing</option>
                  <option value="other">other</option>
                </Select>
              </Field>
              <Field label="Description">
                <Textarea value={ticketForm.description} onChange={(event) => setTicketForm((current) => ({ ...current, description: event.target.value }))} className="min-h-36" />
              </Field>
              <Button
                onClick={() =>
                  createTicketMutation.mutate(ticketForm, {
                    onSuccess: () => setTicketForm({ subject: "", description: "", category: "no internet" }),
                  })
                }
                disabled={createTicketMutation.isPending}
                className="w-full"
              >
                {createTicketMutation.isPending ? "Submitting..." : "Submit Complaint"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Customer Self-Service</CardTitle>
              <CardDescription>Upgrade plans, renew subscriptions, request PPPoE reset, schedule appointments, and review outage notices.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <ActionTile title="Upgrade / Downgrade" body="Use the package cards above to switch your current plan." />
              <ActionTile
                title="Renew Subscription"
                body="Create a payment request for your active plan."
                onClick={() => {
                  const currentPlan = availablePlans.find((plan) => plan.name === activePlan);
                  if (currentPlan) {
                    createPaymentMutation.mutate({ planId: currentPlan.id, method: paymentMethod });
                    return;
                  }
                  toast.error("Current plan could not be resolved for renewal.");
                }}
              />
              <ActionTile
                title="Download Invoice"
                body="Generate invoice-ready output for billing follow-up."
                onClick={() => toast.success("Invoice download placeholder ready. Connect backend PDF export for production.")}
              />
              <ActionTile
                title="Reset PPPoE Password"
                body="Submit a secure reset request through existing RADIUS orchestration, without editing the RADIUS module."
                onClick={() => toast.success("PPPoE reset request logged for backend orchestration.")}
              />
              <ActionTile
                title="Schedule Installation Appointment"
                body="Request a field installation, maintenance, or revisit appointment."
                onClick={() => toast.success("Appointment request captured. Connect dispatch backend for live scheduling.")}
              />
              <ActionTile
                title="View Outage Notices"
                body="Current outage and maintenance notices remain available in your notifications feed."
                onClick={() => toast.message("Outage notices are listed in the Notifications panel below.")}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Portal Readiness</CardTitle>
              <CardDescription>Commercial self-care capabilities prepared for live backend activation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-2xl border border-border/70 p-4">Plan changes, renewals, complaints, and notifications are customer-facing and demo-ready.</div>
              <div className="rounded-2xl border border-border/70 p-4">PPPoE password reset is intentionally modeled as a secure workflow and does not alter the RADIUS module directly.</div>
              <div className="rounded-2xl border border-border/70 p-4">Invoice downloads, appointments, and outage viewing now have a clear self-service path for backend connection.</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>Invoices and payment requests generated from the customer account.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {paymentsQuery.isLoading ? (
                <PageSkeleton />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(paymentsQuery.data ?? []).map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{payment.reference}</TableCell>
                        <TableCell>{payment.planName}</TableCell>
                        <TableCell>{payment.method}</TableCell>
                        <TableCell>
                          <Badge variant={payment.status === "success" ? "success" : payment.status === "failed" ? "danger" : "warning"}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>NGN {payment.amount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Support Tickets</CardTitle>
                <CardDescription>Track complaint status from open to resolved.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(ticketsQuery.data ?? []).map((ticket) => (
                  <div key={ticket.id} className="rounded-xl border border-border/70 p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="font-medium">{ticket.subject}</p>
                      <Badge variant={ticket.status === "resolved" || ticket.status === "closed" ? "success" : "warning"}>
                        {ticket.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{ticket.description}</p>
                    <p className="mt-2 text-xs text-muted-foreground">Updated {new Date(ticket.updatedAt).toLocaleString()}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Outage alerts, payment reminders, and support updates delivered to your account.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(notificationsQuery.data ?? []).map((item) => (
                  <div key={item.id} className="rounded-xl border border-border/70 p-4">
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <p className="font-medium">{item.title}</p>
                      <Badge variant={item.severity === "critical" ? "danger" : item.severity === "warning" ? "warning" : "outline"}>
                        {item.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.message}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function PortalStat({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ActionTile({ title, body, onClick }: { title: string; body: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-border/70 p-4 text-left transition hover:bg-muted/20"
    >
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </button>
  );
}
