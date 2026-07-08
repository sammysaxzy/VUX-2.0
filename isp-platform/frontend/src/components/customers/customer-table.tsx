"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Link } from "react-router-dom";
import { buildCustomerServiceLabel, formatPlanAndFee, getCustomerPaymentStatus, getCustomerSignalHealth, getCustomerStatusTone } from "@/lib/isp";
import { formatDateOrDash, formatDateTimeOrDash, titleCase } from "@/lib/utils";
import type { Customer } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Props = {
  customers: Customer[];
  onSelect: (customer: Customer) => void;
};

export function CustomerTable({ customers, onSelect }: Props) {
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [installFilter, setInstallFilter] = useState("all");

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return customers.filter((customer) => {
      const matchesSearch =
        !term ||
        customer.name.toLowerCase().includes(term) ||
        customer.id.toLowerCase().includes(term) ||
        customer.email.toLowerCase().includes(term) ||
        customer.phone.toLowerCase().includes(term) ||
        buildCustomerServiceLabel(customer).toLowerCase().includes(term) ||
        (customer.planName ?? "").toLowerCase().includes(term);
      const matchesAccount = accountFilter === "all" || customer.accountStatus === accountFilter;
      const matchesPayment = paymentFilter === "all" || getCustomerPaymentStatus(customer) === paymentFilter;
      const matchesInstall = installFilter === "all" || (customer.installStatus ?? "pending") === installFilter;
      return matchesSearch && matchesAccount && matchesPayment && matchesInstall;
    });
  }, [accountFilter, customers, installFilter, paymentFilter, search]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 xl:grid-cols-[1.4fr_repeat(3,minmax(0,180px))]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Search by name, phone, plan, ID, or location" />
        </div>
        <Select value={accountFilter} onChange={(event) => setAccountFilter(event.target.value)}>
          <option value="all">All account states</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </Select>
        <Select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}>
          <option value="all">All payment states</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
        </Select>
        <Select value={installFilter} onChange={(event) => setInstallFilter(event.target.value)}>
          <option value="all">All install states</option>
          <option value="installed">Installed</option>
          <option value="scheduled">Scheduled</option>
          <option value="pending">Pending</option>
        </Select>
      </div>
      <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-border/70">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Plan & Billing</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Optical</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((customer) => {
                const paymentStatus = getCustomerPaymentStatus(customer);
                const signalTone = getCustomerSignalHealth(customer);
                const accountTone = getCustomerStatusTone(customer);
                return (
                  <TableRow key={customer.id} className="cursor-pointer align-top" onClick={() => onSelect(customer)}>
                    <TableCell className="min-w-[220px]">
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">{customer.id} • {customer.phone}</p>
                      <p className="text-xs text-muted-foreground">{customer.email}</p>
                    </TableCell>
                    <TableCell className="min-w-[220px]">
                      <p className="font-medium">{formatPlanAndFee(customer)}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant={paymentStatus === "paid" ? "success" : paymentStatus === "overdue" ? "danger" : "warning"}>
                          {titleCase(paymentStatus)}
                        </Badge>
                        <Badge variant="outline">Due {formatDateOrDash(customer.nextInvoiceDate)}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[220px]">
                      <p className="font-medium">{buildCustomerServiceLabel(customer)}</p>
                      <p className="text-xs text-muted-foreground">
                        Technician: {customer.assignedEngineer ?? "Unassigned"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Install: {titleCase(customer.installStatus ?? "pending")} • {formatDateOrDash(customer.installDate)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">RX {customer.rxSignal} dBm</p>
                      <p className="text-xs text-muted-foreground">TX {customer.txSignal} dBm</p>
                      <Badge variant={signalTone === "healthy" ? "success" : signalTone === "warning" ? "warning" : "danger"} className="mt-2">
                        {signalTone === "healthy" ? "Healthy" : signalTone === "warning" ? "Watch" : "Critical"}
                      </Badge>
                    </TableCell>
                    <TableCell className="min-w-[180px]">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={accountTone}>
                          {customer.accountStatus === "suspended" ? "Suspended" : customer.online ? "Online" : "Offline"}
                        </Badge>
                        <Badge variant={customer.installStatus === "installed" ? "success" : "warning"}>
                          {titleCase(customer.installStatus ?? "pending")}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        PPPoE: {customer.pppoeUsername ?? "Not assigned"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Last seen: {formatDateTimeOrDash(customer.lastSeenAt)}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to={`/customers/${customer.id}`}>
                        <Button size="sm" variant="outline">
                          Profile
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    No customer records match the current filters.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
