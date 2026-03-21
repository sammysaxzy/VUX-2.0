"use client";

import type { RadiusPlan } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type PlanManagerProps = {
  plans: RadiusPlan[];
};

export function PlanManager({ plans }: PlanManagerProps) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-1">
        <CardTitle>Authorization Plans</CardTitle>
        <CardDescription>Each plan writes the Mikrotik-Rate-Limit value into radreply.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan Name</TableHead>
              <TableHead>Speed</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Rate Limit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan) => (
              <TableRow key={plan.name}>
                <TableCell>{plan.name}</TableCell>
                <TableCell>{plan.speed}</TableCell>
                <TableCell>{plan.price}</TableCell>
                <TableCell>{plan.rateLimit}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
