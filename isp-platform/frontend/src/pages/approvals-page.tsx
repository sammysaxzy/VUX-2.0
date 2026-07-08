import { useApprovalRequests, useCommissionRecords, useDiscountPromos } from "@/hooks/api/use-operations";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export function ApprovalsPage() {
  const approvals = useApprovalRequests();
  const promos = useDiscountPromos();
  const commissions = useCommissionRecords();

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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
