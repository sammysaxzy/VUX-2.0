"use client";

import { Power, PlugZap } from "lucide-react";
import type { RadiusSession } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatRelativeDate } from "@/lib/utils";

type Props = {
  sessions: RadiusSession[];
  onDisconnect: (username: string) => void;
  onActivate: (username: string) => void;
  busyDisconnect?: string;
  busyActivate?: string;
};

export function RadiusSessionTable({ sessions, onDisconnect, onActivate, busyDisconnect, busyActivate }: Props) {
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
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => {
              const isActive = session.accountStatus === "active";
              const missingAccount = session.accountExists === false;
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
                  <TableCell>
                    <Badge variant={session.status === "online" ? "success" : "outline"}>{session.status}</Badge>
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
                        disabled={missingAccount || isActive || busyActivate === session.username}
                        onClick={() => onActivate(session.username)}
                        title={
                          missingAccount
                            ? "User missing from authentication store"
                            : isActive
                            ? "User already active"
                            : undefined
                        }
                      >
                        <Power className="mr-1 h-3.5 w-3.5" />
                        Activate
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
