"use client";

import type { RadiusUser } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateOnly, isRadiusUserExpired, isRadiusUserExpiringSoon } from "@/lib/utils";

type Props = {
  users: RadiusUser[];
  selectedUsernames: string[];
  onToggleSelect: (username: string) => void;
  onToggleSelectAll: () => void;
  onActivate: (username: string) => void;
  onSync: (username: string) => void;
  onExtend: (username: string) => void;
  busyActivate?: string;
  busySync?: string;
  busyExtend?: string;
  now?: number;
};

export function UsersTable({
  users,
  selectedUsernames,
  onToggleSelect,
  onToggleSelectAll,
  onActivate,
  onSync,
  onExtend,
  busyActivate,
  busySync,
  busyExtend,
  now = Date.now(),
}: Props) {
  const allSelected = users.length > 0 && users.every((user) => selectedUsernames.includes(user.username));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>PPPoE Users</CardTitle>
        <Badge variant="outline">{users.length} accounts</Badge>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input type="checkbox" checked={allSelected} onChange={onToggleSelectAll} aria-label="Select all users" />
              </TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expiration Date</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Zone</TableHead>
              <TableHead>NAS</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const isExpired = isRadiusUserExpired(user.expirationDate, now);
              const isExpiringSoon = !isExpired && isRadiusUserExpiringSoon(user.expirationDate, now);
              const disabled = user.status === "active" || !user.exists || isExpired;
              return (
                <TableRow key={user.username}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedUsernames.includes(user.username)}
                      onChange={() => onToggleSelect(user.username)}
                      aria-label={`Select ${user.username}`}
                    />
                  </TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>
                    <Badge variant={isExpired ? "danger" : isExpiringSoon ? "warning" : "success"}>
                      {isExpired ? "expired" : isExpiringSoon ? "expiring soon" : "active"}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDateOnly(user.expirationDate)}</TableCell>
                  <TableCell>{user.plan}</TableCell>
                  <TableCell>{user.zone}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{user.nas}</p>
                      {user.staticIp ? <p className="text-xs text-muted-foreground">Static IP {user.staticIp}</p> : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={disabled || busyActivate === user.username}
                        onClick={() => onActivate(user.username)}
                        title={
                          !user.exists
                            ? "User missing from authentication store"
                            : user.status === "active"
                            ? "Already active"
                            : undefined
                        }
                      >
                        Activate
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyExtend === user.username}
                        onClick={() => onExtend(user.username)}
                      >
                        Extend
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!user.exists || busySync === user.username}
                        onClick={() => onSync(user.username)}
                        title={!user.exists ? "User missing from authentication store" : undefined}
                      >
                        Sync
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
