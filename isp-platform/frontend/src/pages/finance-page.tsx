import { type ReactNode, useState } from "react";
import { LineChart, RefreshCcw, Wallet } from "lucide-react";
import { useCreateFinancialTransaction, useFinanceSummary, useFinancialTransactions, useSyncBillingIncome } from "@/hooks/api/use-finance";
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

  if (summary.isLoading || transactions.isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Finance & Bookkeeping</h1>
          <p className="text-sm text-muted-foreground">Track income, expenses, cash flow, and operating margin in one place.</p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Wallet className="h-3.5 w-3.5" />
          {summary.data?.transaction_count ?? 0} transactions
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard title="Total Income" value={`NGN ${(summary.data?.total_income ?? 0).toLocaleString()}`} subtitle="Subscriptions, installs, device sales" />
        <MetricCard title="Total Expenses" value={`NGN ${(summary.data?.total_expenses ?? 0).toLocaleString()}`} subtitle="Purchases, salaries, logistics, maintenance" />
        <MetricCard title="Net Profit" value={`NGN ${(summary.data?.net_profit ?? 0).toLocaleString()}`} subtitle="Simple P&L for the MVP phase" />
        <MetricCard title="Cash Flow" value={`NGN ${(summary.data?.cash_flow ?? 0).toLocaleString()}`} subtitle="Income minus expenses" />
        <MetricCard title="Inventory Value" value={`NGN ${(summary.data?.inventory_value ?? 0).toLocaleString()}`} subtitle="Closing stock value at cost" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Expenses Today" value={`NGN ${(summary.data?.expenses_today ?? 0).toLocaleString()}`} subtitle="Daily operating outflow" />
        <MetricCard title="Expenses This Week" value={`NGN ${(summary.data?.expenses_this_week ?? 0).toLocaleString()}`} subtitle="Weekly purchasing and field spend" />
        <MetricCard title="Expenses This Month" value={`NGN ${(summary.data?.expenses_this_month ?? 0).toLocaleString()}`} subtitle="Monthly cost trend for operations" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>Central bookkeeping log for operating income and expenses.</CardDescription>
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
                    <TableCell>NGN {transaction.amount.toLocaleString()}</TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell>{new Date(transaction.transaction_date).toLocaleString()}</TableCell>
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
              Record Transaction
            </CardTitle>
            <CardDescription>Use this for expenses, installation fees, purchases, fuel, salaries, and one-off sales.</CardDescription>
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
