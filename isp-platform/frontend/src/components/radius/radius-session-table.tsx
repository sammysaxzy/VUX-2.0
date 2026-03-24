"use client";

import { RotateCcw, PlugZap } from "lucide-react";
import type { RadiusSession } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateOnly, formatRelativeDate, isRadiusUserExpired } from "@/lib/utils";

type Props = {
  sessions: RadiusSession[];
  onDisconnect: (username: string) => void;
  onReconnect: (username: string) => void;
  busyDisconnect?: string;
  busyReconnect?: string;
  now?: number;
};

export function RadiusSessionTable({ sessions, onDisconnect, onReconnect, busyDisconnect, busyReconnect, now = Date.now() }: Props) {
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
              <TableHead>Duration</TableHead>
              <TableHead>Data usage</TableHead>
              <TableHead>Expiration Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => {
              const isExpired = session.expirationDate ? isRadiusUserExpired(session.expirationDate, now) : false;
              return (
                <TableRow key={session.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{session.username}</p>
                      <p className="text-xs text-muted-foreground">{session.customerId}</p>
                      {session.plan && <p className="text-xs text-muted-foreground">Plan: {session.plan}</p>}
                    </div>
                  </TableCell>
                  <TableCell>{session.ipAddress}</TableCell>
                  <TableCell>{formatRelativeDate(session.startedAt)}</TableCell>
                  <TableCell>{session.duration ?? "-"}</TableCell>
                  <TableCell>{session.dataUsage ?? "-"}</TableCell>
                  <TableCell>{session.expirationDate ? formatDateOnly(session.expirationDate) : "-"}</TableCell>
                  <TableCell>
                    <Badge variant={isExpired ? "danger" : session.status === "online" ? "success" : "outline"}>
                      {isExpired ? "expired" : session.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyDisconnect === session.username}
                        onClick={() => onDisconnect(session.username)}
                      >
                        <PlugZap className="mr-1 h-3.5 w-3.5" />
                        Disconnect
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={session.accountExists === false || isExpired || busyReconnect === session.username}
                        onClick={() => onReconnect(session.username)}
                        title={
                          session.accountExists === false
                            ? "User missing from authentication store"
                            : isExpired
                            ? "Expired users cannot reconnect"
                            : undefined
                        }
                      >
                        <RotateCcw className="mr-1 h-3.5 w-3.5" />
                        Reconnect
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
