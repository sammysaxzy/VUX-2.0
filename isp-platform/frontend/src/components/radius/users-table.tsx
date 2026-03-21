"use client";

import type { RadiusUser } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Props = {
  users: RadiusUser[];
  onActivate: (username: string) => void;
  busyActivate?: string;
};

export function UsersTable({ users, onActivate, busyActivate }: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Radius Users</CardTitle>
        <Badge variant="outline">{users.length} accounts</Badge>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>ONU Serial</TableHead>
              <TableHead>OLT / PON</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const disabled = user.status === "active" || !user.exists;
              return (
                <TableRow key={user.username}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>
                    <Badge variant={user.status === "active" ? "success" : "outline"}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.plan}</TableCell>
                  <TableCell>{user.onuSerial}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{user.olt}</p>
                      <p className="text-xs text-muted-foreground">PON {user.ponPort}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
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
