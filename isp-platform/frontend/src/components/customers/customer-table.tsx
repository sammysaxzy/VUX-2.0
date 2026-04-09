"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Link } from "react-router-dom";
import type { Customer } from "@/types";
import { Button } from "@/components/ui/button";
import { CustomerContactCells } from "@/components/customers/customer-contact-cells";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Props = {
  customers: Customer[];
  onSelect: (customer: Customer) => void;
};

export function CustomerTable({ customers, onSelect }: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return customers;
    return customers.filter((customer) => {
      return (
        customer.name.toLowerCase().includes(term) ||
        customer.id.toLowerCase().includes(term) ||
        customer.email.toLowerCase().includes(term) ||
        customer.address.toLowerCase().includes(term)
      );
    });
  }, [customers, search]);

  return (
    <div className="space-y-3">
      <div className="relative max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Search customers" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-border/70">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((customer) => (
                <TableRow key={customer.id} className="cursor-pointer" onClick={() => onSelect(customer)}>
                  <TableCell>
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-xs text-muted-foreground">{customer.id}</p>
                  </TableCell>
                  <CustomerContactCells customer={customer} />
                  <TableCell className="text-right">
                    <Link to={`/customers/${customer.id}`}>
                      <Button size="sm" variant="outline">
                        Profile
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    No customer records found.
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
