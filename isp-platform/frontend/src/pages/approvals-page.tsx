import { useState } from "react";
import {
  useApprovalRequests,
  useCommissionRecords,
  useDiscountPromos,
  useSaveApprovalRequest,
  useSaveCommissionRecord,
  useSaveDiscountPromo,
} from "@/hooks/api/use-operations";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Select } from "@/components/ui/select";
import type { ApprovalWorkflowRecord, CommissionRecord, DiscountPromoRecord } from "@/types";

const blankApproval: ApprovalWorkflowRecord = {
  id: "",
  type: "discount",
  requester: "",
  target: "",
  status: "pending",
  requestedAt: new Date().toISOString(),
};

const blankPromo: DiscountPromoRecord = {
  id: "",
  code: "",
  type: "fixed",
  amount: 0,
  expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
  eligiblePlans: [],
  approvalStatus: "pending",
  usageCount: 0,
};

const blankCommission: CommissionRecord = {
  id: "",
  partnerName: "",
  leadSource: "",
  convertedCustomer: "",
  planValue: 0,
  commissionAmount: 0,
  approvalStatus: "pending",
  payoutStatus: "pending",
};

export function ApprovalsPage() {
  const approvals = useApprovalRequests();
  const promos = useDiscountPromos();
  const commissions = useCommissionRecords();
  const saveApproval = useSaveApprovalRequest();
  const savePromo = useSaveDiscountPromo();
  const saveCommission = useSaveCommissionRecord();
  const [approvalForm, setApprovalForm] = useState<ApprovalWorkflowRecord>(blankApproval);
  const [promoForm, setPromoForm] = useState<DiscountPromoRecord>(blankPromo);
  const [commissionForm, setCommissionForm] = useState<CommissionRecord>(blankCommission);

  if (approvals.isLoading || promos.isLoading || commissions.isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold">Approvals, Promos & Commissions</h1>
        <p className="text-sm text-muted-foreground">
          Control sensitive actions, review discounts and promos, and track marketer, agent, reseller, and referral commissions.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Approval Workflow</CardTitle>
            <CardDescription>Refunds, discounts, plan price changes, write-offs, large expenses, and enterprise changes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(approvals.data ?? []).map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-border/70 p-4 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{entry.type.replace(/_/g, " ")}</p>
                  <Badge variant={entry.status === "approved" ? "success" : entry.status === "rejected" ? "danger" : "warning"}>{entry.status}</Badge>
                </div>
                <p className="mt-1 text-muted-foreground">{entry.target}</p>
                <p className="mt-1">{entry.requester}</p>
              </div>
            ))}
            <div className="space-y-3 rounded-2xl border border-dashed border-border p-4">
              <Field label="Requester"><Input value={approvalForm.requester} onChange={(event) => setApprovalForm((current) => ({ ...current, requester: event.target.value }))} /></Field>
              <Field label="Type">
                <Select value={approvalForm.type} onChange={(event) => setApprovalForm((current) => ({ ...current, type: event.target.value as ApprovalWorkflowRecord["type"] }))}>
                  <option value="refund">refund</option>
                  <option value="discount">discount</option>
                  <option value="plan_price_change">plan_price_change</option>
                  <option value="customer_deletion">customer_deletion</option>
                  <option value="device_write_off">device_write_off</option>
                  <option value="large_expense">large_expense</option>
                  <option value="enterprise_change">enterprise_change</option>
                </Select>
              </Field>
              <Field label="Target"><Input value={approvalForm.target} onChange={(event) => setApprovalForm((current) => ({ ...current, target: event.target.value }))} /></Field>
              <Field label="Amount">
                <Input type="number" value={approvalForm.amount ?? 0} onChange={(event) => setApprovalForm((current) => ({ ...current, amount: Number(event.target.value) }))} />
              </Field>
              <Button
                onClick={() =>
                  saveApproval.mutate(
                    { ...approvalForm, requestedAt: new Date().toISOString() },
                    { onSuccess: () => setApprovalForm(blankApproval) },
                  )
                }
                disabled={saveApproval.isPending || !approvalForm.requester.trim() || !approvalForm.target.trim()}
              >
                {saveApproval.isPending ? "Saving..." : "Create Approval"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Discount / Promo Management</CardTitle>
            <CardDescription>Track promo type, amount, expiry, eligible plans, approval status, and usage history.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(promos.data ?? []).map((promo) => (
              <div key={promo.id} className="rounded-2xl border border-border/70 p-4 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{promo.code}</p>
                  <Badge variant={promo.approvalStatus === "approved" ? "success" : promo.approvalStatus === "rejected" ? "danger" : "warning"}>
                    {promo.approvalStatus}
                  </Badge>
                </div>
                <p className="mt-1 text-muted-foreground">{promo.type} | {promo.amount}</p>
                <p className="mt-1">Usage: {promo.usageCount}</p>
              </div>
            ))}
            <div className="space-y-3 rounded-2xl border border-dashed border-border p-4">
              <Field label="Promo Code"><Input value={promoForm.code} onChange={(event) => setPromoForm((current) => ({ ...current, code: event.target.value }))} /></Field>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Type">
                  <Select value={promoForm.type} onChange={(event) => setPromoForm((current) => ({ ...current, type: event.target.value as DiscountPromoRecord["type"] }))}>
                    <option value="fixed">fixed</option>
                    <option value="percentage">percentage</option>
                  </Select>
                </Field>
                <Field label="Amount">
                  <Input type="number" value={promoForm.amount} onChange={(event) => setPromoForm((current) => ({ ...current, amount: Number(event.target.value) }))} />
                </Field>
              </div>
              <Field label="Eligible Plans">
                <Input
                  value={promoForm.eligiblePlans.join(", ")}
                  onChange={(event) => setPromoForm((current) => ({ ...current, eligiblePlans: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) }))}
                  placeholder="Business 50 Mbps, 20 Mbps Home"
                />
              </Field>
              <Button
                onClick={() =>
                  savePromo.mutate(
                    promoForm,
                    { onSuccess: () => setPromoForm(blankPromo) },
                  )
                }
                disabled={savePromo.isPending || !promoForm.code.trim()}
              >
                {savePromo.isPending ? "Saving..." : "Save Promo"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Commission Management</CardTitle>
            <CardDescription>Lead source, converted customer, plan value, commission amount, approval, and payout status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(commissions.data ?? []).map((commission) => (
              <div key={commission.id} className="rounded-2xl border border-border/70 p-4 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{commission.partnerName}</p>
                  <Badge variant={commission.payoutStatus === "paid" ? "success" : commission.payoutStatus === "processing" ? "warning" : "outline"}>
                    {commission.payoutStatus}
                  </Badge>
                </div>
                <p className="mt-1 text-muted-foreground">{commission.convertedCustomer}</p>
                <p className="mt-1">Plan value: {formatCurrency(commission.planValue)}</p>
                <p>Commission: {formatCurrency(commission.commissionAmount)}</p>
              </div>
            ))}
            <div className="space-y-3 rounded-2xl border border-dashed border-border p-4">
              <Field label="Partner Name"><Input value={commissionForm.partnerName} onChange={(event) => setCommissionForm((current) => ({ ...current, partnerName: event.target.value }))} /></Field>
              <Field label="Lead Source"><Input value={commissionForm.leadSource} onChange={(event) => setCommissionForm((current) => ({ ...current, leadSource: event.target.value }))} /></Field>
              <Field label="Converted Customer"><Input value={commissionForm.convertedCustomer} onChange={(event) => setCommissionForm((current) => ({ ...current, convertedCustomer: event.target.value }))} /></Field>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Plan Value"><Input type="number" value={commissionForm.planValue} onChange={(event) => setCommissionForm((current) => ({ ...current, planValue: Number(event.target.value) }))} /></Field>
                <Field label="Commission"><Input type="number" value={commissionForm.commissionAmount} onChange={(event) => setCommissionForm((current) => ({ ...current, commissionAmount: Number(event.target.value) }))} /></Field>
              </div>
              <Button
                onClick={() =>
                  saveCommission.mutate(
                    commissionForm,
                    { onSuccess: () => setCommissionForm(blankCommission) },
                  )
                }
                disabled={saveCommission.isPending || !commissionForm.partnerName.trim() || !commissionForm.convertedCustomer.trim()}
              >
                {saveCommission.isPending ? "Saving..." : "Save Commission"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
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
