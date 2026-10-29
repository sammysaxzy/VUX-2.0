"use client";

import type { RadiusSession } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateOnly, formatRelativeDate } from "@/lib/utils";

type Props = {
  sessions: RadiusSession[];
  onSync: (username: string) => void;
  onSelect: (username: string) => void;
  busySync?: string;
  canSync?: boolean;
};

export function RadiusSessionTable({
  sessions,
  onSync,
  onSelect,
  busySync,
  canSync = true,
}: Props) {
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
            {sessions.map((session) => (
              <TableRow key={session.id} className="cursor-pointer" onClick={() => onSelect(session.username)}>
                <TableCell>
                  <p className="font-medium">{session.username}</p>
                </TableCell>
                <TableCell>{session.ipAddress}</TableCell>
                <TableCell>{formatRelativeDate(session.startedAt)}</TableCell>
                <TableCell>{session.duration ?? "-"}</TableCell>
                <TableCell>{session.dataUsage ?? "-"}</TableCell>
                <TableCell>{session.expirationDate ? formatDateOnly(session.expirationDate) : "-"}</TableCell>
                <TableCell>
                  <Badge variant={session.status === "online" ? "success" : "outline"}>{session.status}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canSync || session.accountExists === false || busySync === session.username}
                      onClick={(event) => {
                        event.stopPropagation();
                        onSync(session.username);
                      }}
                      title={session.accountExists === false ? "User missing from authentication store" : undefined}
                    >
                      Sync
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
