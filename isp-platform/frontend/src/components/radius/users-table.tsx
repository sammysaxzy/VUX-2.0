"use client";

import { RotateCcw, PlugZap } from "lucide-react";
import type { RadiusUser } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateOnly, isRadiusUserExpired } from "@/lib/utils";

type Props = {
  users: RadiusUser[];
  selectedUsernames: string[];
  onToggleSelect: (username: string) => void;
  onToggleSelectAll: () => void;
  onDisconnect: (username: string) => void;
  onReconnect: (username: string) => void;
  busyDisconnect?: string;
  busyReconnect?: string;
  now?: number;
  canManageUsers?: boolean;
  canDisconnect?: boolean;
};

export function UsersTable({
  users,
  selectedUsernames,
  onToggleSelect,
  onToggleSelectAll,
  onDisconnect,
  onReconnect,
  busyDisconnect,
  busyReconnect,
  now = Date.now(),
  canManageUsers = true,
  canDisconnect = true,
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
                <input
                  type="checkbox"
                  checked={allSelected}
                  disabled={!canManageUsers}
                  onChange={onToggleSelectAll}
                  aria-label="Select all users"
                />
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
              return (
                <TableRow key={user.username}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedUsernames.includes(user.username)}
                      disabled={!canManageUsers}
                      onChange={() => onToggleSelect(user.username)}
                      aria-label={`Select ${user.username}`}
                    />
                  </TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>
                    <Badge variant={isExpired ? "danger" : "success"}>{isExpired ? "expired" : "active"}</Badge>
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
                        variant="outline"
                        disabled={!canDisconnect || busyDisconnect === user.username || (user.status !== "active" && !isExpired)}
                        onClick={() => onDisconnect(user.username)}
                      >
                        <PlugZap className="mr-1 h-3.5 w-3.5" />
                        Disconnect
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!canManageUsers || !user.exists || isExpired || busyReconnect === user.username}
                        onClick={() => onReconnect(user.username)}
                        title={!user.exists ? "User missing from authentication store" : isExpired ? "Expired users cannot reconnect" : undefined}
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
