import { type ReactNode, useMemo, useState } from "react";
import { LineChart, RefreshCcw, Wallet } from "lucide-react";
import { useCreateFinancialTransaction, useFinanceSummary, useFinancialTransactions, useSyncBillingIncome } from "@/hooks/api/use-finance";
import { useCustomers } from "@/hooks/api/use-customers";
import { buildInvoiceFromCustomer, getInvoiceSummary } from "@/lib/isp";
import { formatCurrency, formatDateOrDash, titleCase } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { FinanceEntryType, ReferenceType } from "@/types";

const referenceTypes: ReferenceType[] = [
  "subscription",
  "inventory_purchase",
  "inventory_usage",
  "customer_installation",
  "device_sale",
  "salary",
  "maintenance",
  "logistics",
  "other",
];

export function FinancePage() {
  const summary = useFinanceSummary();
  const transactions = useFinancialTransactions();
  const customers = useCustomers();
  const createTransaction = useCreateFinancialTransaction();
  const syncBilling = useSyncBillingIncome();
  const [form, setForm] = useState({
    entry_type: "income" as FinanceEntryType,
    category: "subscription",
    amount: 0,
    description: "",
    reference_type: "subscription" as ReferenceType,
    reference_id: "",
    inventory_item_id: undefined as number | undefined,
    inventory_movement_id: undefined as number | undefined,
    client_id: undefined as number | undefined,
    payment_id: undefined as number | undefined,
    transaction_date: new Date().toISOString().slice(0, 16),
  });

  const invoices = useMemo(() => (customers.data ?? []).map(buildInvoiceFromCustomer), [customers.data]);
  const invoiceSummary = useMemo(() => getInvoiceSummary(invoices), [invoices]);

  if (summary.isLoading || transactions.isLoading || customers.isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Billing, Payments & Finance</h1>
          <p className="text-sm text-muted-foreground">
            Track invoices, customer balances, payment collection, renewals, and operating ledger activity in one view.
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Wallet className="h-3.5 w-3.5" />
          {summary.data?.transaction_count ?? 0} transactions
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard title="Revenue" value={formatCurrency(summary.data?.total_income ?? 0)} subtitle="Recognized collections and installation income" />
        <MetricCard title="Expenses" value={formatCurrency(summary.data?.total_expenses ?? 0)} subtitle="Purchases, dispatch, maintenance, and operating costs" />
        <MetricCard title="Outstanding Balance" value={formatCurrency(invoiceSummary.outstandingAmount)} subtitle="Receivables awaiting payment" />
        <MetricCard title="Overdue Invoices" value={`${invoiceSummary.overdue}`} subtitle="Customers who need renewal or collection follow-up" />
        <MetricCard title="Cash Flow" value={formatCurrency(summary.data?.cash_flow ?? 0)} subtitle="High-level business health snapshot" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Invoice & Renewal Queue</CardTitle>
                <CardDescription>Commercial billing posture across active customer accounts.</CardDescription>
              </div>
              <Button variant="outline" onClick={() => syncBilling.mutate()} disabled={syncBilling.isPending}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Sync Billing Income
              </Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.customerName}</TableCell>
                    <TableCell>{invoice.reference}</TableCell>
                    <TableCell>{invoice.planName}</TableCell>
                    <TableCell>{formatDateOrDash(invoice.dueDate)}</TableCell>
                    <TableCell>
                      <Badge variant={invoice.status === "paid" ? "success" : invoice.status === "overdue" ? "danger" : "warning"}>
                        {titleCase(invoice.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(invoice.balance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Paystack Readiness</CardTitle>
            <CardDescription>Production payment flow should stay backend-driven and environment-based.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-2xl border border-border/70 p-4">
              <p className="font-medium">Required environment variables</p>
              <p className="mt-2 text-muted-foreground">`PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`, `PAYSTACK_WEBHOOK_SECRET`, `PAYSTACK_CALLBACK_URL`</p>
            </div>
            <div className="rounded-2xl border border-border/70 p-4">
              <p className="font-medium">Production notes</p>
              <p className="mt-2 text-muted-foreground">Initialize transactions on the backend, verify callbacks server-side, and never expose secret keys in the frontend.</p>
            </div>
            <div className="rounded-2xl border border-border/70 p-4">
              <p className="font-medium">Plan renewal flow</p>
              <p className="mt-2 text-muted-foreground">Issue invoice, start Paystack checkout, verify webhook, then update account/payment status and renewal dates.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>Central bookkeeping log for operating income and expenses.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(transactions.data ?? []).map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">{transaction.transaction_code}</TableCell>
                    <TableCell>
                      <Badge variant={transaction.entry_type === "income" ? "success" : "outline"}>{transaction.entry_type}</Badge>
                    </TableCell>
                    <TableCell className="capitalize">{transaction.category}</TableCell>
                    <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell>{formatDateOrDash(transaction.transaction_date)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-4 w-4 text-primary" />
              Record Manual Transaction
            </CardTitle>
            <CardDescription>Use this for verified expenses, installation fees, logistics, and one-off service income.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="Entry Type">
                <Select value={form.entry_type} onChange={(event) => setForm((state) => ({ ...state, entry_type: event.target.value as FinanceEntryType }))}>
                  <option value="income">income</option>
                  <option value="expense">expense</option>
                </Select>
              </FormField>
              <FormField label="Category">
                <Input value={form.category} onChange={(event) => setForm((state) => ({ ...state, category: event.target.value }))} />
              </FormField>
            </div>
            <FormField label="Amount">
              <Input type="number" value={form.amount} onChange={(event) => setForm((state) => ({ ...state, amount: Number(event.target.value) }))} />
            </FormField>
            <FormField label="Reference Type">
              <Select value={form.reference_type} onChange={(event) => setForm((state) => ({ ...state, reference_type: event.target.value as ReferenceType }))}>
                {referenceTypes.map((referenceType) => (
                  <option key={referenceType} value={referenceType}>
                    {referenceType}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Reference ID">
              <Input value={form.reference_id} onChange={(event) => setForm((state) => ({ ...state, reference_id: event.target.value }))} placeholder="Invoice, payment id, purchase ref" />
            </FormField>
            <FormField label="Transaction Date">
              <Input type="datetime-local" value={form.transaction_date} onChange={(event) => setForm((state) => ({ ...state, transaction_date: event.target.value }))} />
            </FormField>
            <FormField label="Description">
              <Textarea value={form.description} onChange={(event) => setForm((state) => ({ ...state, description: event.target.value }))} />
            </FormField>
            <Button
              onClick={() =>
                createTransaction.mutate({
                  ...form,
                  transaction_date: new Date(form.transaction_date).toISOString(),
                })
              }
              disabled={!form.category || !form.amount || !form.description}
            >
              Save Transaction
            </Button>
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
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
