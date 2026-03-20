"use client";

import { Ban, PlugZap } from "lucide-react";
import type { RadiusSession } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatRelativeDate } from "@/lib/utils";

type Props = {
  sessions: RadiusSession[];
  onDisconnect: (sessionId: string) => void;
  onSuspend: (customerId: string) => void;
  busyId?: string;
};

export function RadiusSessionTable({ sessions, onDisconnect, onSuspend, busyId }: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>PPPoE Sessions</CardTitle>
        <Badge variant="outline">{sessions.length} sessions</Badge>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{session.username}</p>
                    <p className="text-xs text-muted-foreground">{session.customerId}</p>
                  </div>
                </TableCell>
                <TableCell>{session.ipAddress}</TableCell>
                <TableCell>{formatRelativeDate(session.startedAt)}</TableCell>
                <TableCell>
                  <Badge variant={session.status === "online" ? "success" : "outline"}>{session.status}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === session.id}
                      onClick={() => onDisconnect(session.id)}
                    >
                      <PlugZap className="mr-1 h-3.5 w-3.5" />
                      Disconnect
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={busyId === session.customerId}
                      onClick={() => onSuspend(session.customerId)}
                    >
                      <Ban className="mr-1 h-3.5 w-3.5" />
                      Suspend
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
