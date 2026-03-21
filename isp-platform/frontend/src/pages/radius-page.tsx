"use client";

import { useEffect, useMemo, useState } from "react";
import type { RadiusTab } from "@/types";
import {
  useActivateRadiusUser,
  useCreateRadiusUser,
  useDisconnectSession,
  useRadiusPlans,
  useRadiusSettings,
  useRadiusSessions,
  useRadiusUsers,
  useSaveRadiusSettings,
} from "@/hooks/api/use-radius";
import { useRadiusRealtime } from "@/hooks/use-radius-realtime";
import { RadiusSessionTable } from "@/components/radius/radius-session-table";
import { RadiusTabs } from "@/components/radius/radius-tabs";
import { UsersTable } from "@/components/radius/users-table";
import { PlanManager } from "@/components/radius/plan-manager";
import { SettingsForm } from "@/components/radius/settings-form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { PageSkeleton } from "@/components/ui/page-skeleton";

type RadiusUserForm = {
  username: string;
  password: string;
  plan: string;
  onuSerial: string;
  olt: string;
  ponPort: string;
};

const baseForm: RadiusUserForm = {
  username: "",
  password: "",
  plan: "",
  onuSerial: "",
  olt: "",
  ponPort: "",
};

export function RadiusPage() {
  const [activeTab, setActiveTab] = useState<RadiusTab>("sessions");
  const [newUser, setNewUser] = useState<RadiusUserForm>(baseForm);

  const sessionsQuery = useRadiusSessions();
  const disconnectMutation = useDisconnectSession();
  const usersQuery = useRadiusUsers();
  const createUserMutation = useCreateRadiusUser();
  const activateUserMutation = useActivateRadiusUser();
  const plansQuery = useRadiusPlans();
  const settingsQuery = useRadiusSettings();
  const saveSettingsMutation = useSaveRadiusSettings();

  useRadiusRealtime();

  const planOptions = useMemo(() => plansQuery.data ?? [], [plansQuery.data]);
  const createUserSuccess = createUserMutation.isSuccess;
  const resetCreateUser = createUserMutation.reset;

  useEffect(() => {
    if (!planOptions.length) return;
    setNewUser((prev) => {
      if (prev.plan) return prev;
      return { ...prev, plan: planOptions[0]?.name ?? "" };
    });
  }, [planOptions]);

  useEffect(() => {
    if (!createUserSuccess) return;
    setNewUser({
      username: "",
      password: "",
      plan: planOptions[0]?.name ?? "",
      onuSerial: "",
      olt: "",
      ponPort: "",
    });
    resetCreateUser();
  }, [createUserSuccess, planOptions, resetCreateUser]);

  const canCreateUser =
    Boolean(newUser.username.trim()) &&
    Boolean(newUser.password.trim()) &&
    Boolean(newUser.plan.trim()) &&
    Boolean(newUser.onuSerial.trim()) &&
    Boolean(newUser.olt.trim()) &&
    Boolean(newUser.ponPort.trim());

  return (
    <div className="space-y-4 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold">RADIUS Session Control</h1>
        <p className="text-sm text-muted-foreground">
          Manage PPPoE sessions while operating authentication, authorization, and accounting controls.
        </p>
      </div>

      <RadiusTabs value={activeTab} onChange={setActiveTab} />

      <div className="space-y-4">
        {activeTab === "sessions" &&
          (sessionsQuery.isLoading || !sessionsQuery.data ? (
            <PageSkeleton />
          ) : (
            <RadiusSessionTable
              sessions={sessionsQuery.data}
              onDisconnect={(username) => disconnectMutation.mutate(username)}
              onActivate={(username) => activateUserMutation.mutate(username)}
              busyDisconnect={disconnectMutation.variables}
              busyActivate={activateUserMutation.variables}
            />
          ))}

        {activeTab === "users" && (
          <div className="space-y-4">
            {usersQuery.isLoading || !usersQuery.data ? (
              <PageSkeleton />
            ) : (
              <UsersTable
                users={usersQuery.data}
                onActivate={(username) => activateUserMutation.mutate(username)}
                busyActivate={activateUserMutation.variables}
              />
            )}

            <Card>
              <CardHeader className="flex flex-col gap-1">
                <CardTitle>Create Radius User</CardTitle>
                <CardDescription>Provision authentication + authorization in a single action.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="radius-username">Username</Label>
                    <Input
                      id="radius-username"
                      value={newUser.username}
                      onChange={(event) => setNewUser((prev) => ({ ...prev, username: event.target.value }))}
                      placeholder="jdoe_pppoe"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="radius-password">Password</Label>
                    <Input
                      id="radius-password"
                      type="password"
                      value={newUser.password}
                      onChange={(event) => setNewUser((prev) => ({ ...prev, password: event.target.value }))}
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="radius-plan">Plan</Label>
                    <Select
                      id="radius-plan"
                      value={newUser.plan}
                      onChange={(event) => setNewUser((prev) => ({ ...prev, plan: event.target.value }))}
                    >
                      <option value="">Select plan</option>
                      {planOptions.map((plan) => (
                        <option key={plan.name} value={plan.name}>
                          {plan.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="radius-onu">ONU Serial</Label>
                    <Input
                      id="radius-onu"
                      value={newUser.onuSerial}
                      onChange={(event) => setNewUser((prev) => ({ ...prev, onuSerial: event.target.value }))}
                      placeholder="ZTEG12398A"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="radius-olt">OLT</Label>
                    <Input
                      id="radius-olt"
                      value={newUser.olt}
                      onChange={(event) => setNewUser((prev) => ({ ...prev, olt: event.target.value }))}
                      placeholder="OLT HQ Core"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="radius-pon">PON Port</Label>
                    <Input
                      id="radius-pon"
                      value={newUser.ponPort}
                      onChange={(event) => setNewUser((prev) => ({ ...prev, ponPort: event.target.value }))}
                      placeholder="1/3/7"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => createUserMutation.mutate(newUser)}
                  disabled={!canCreateUser || createUserMutation.isLoading}
                >
                  {createUserMutation.isLoading ? "Provisioning…" : "Create user"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}

        {activeTab === "plans" &&
          (plansQuery.isLoading || !plansQuery.data ? <PageSkeleton /> : <PlanManager plans={plansQuery.data} />)}

        {activeTab === "settings" &&
          (settingsQuery.isLoading || !settingsQuery.data ? (
            <PageSkeleton />
          ) : (
            <SettingsForm
              settings={settingsQuery.data}
              onSave={(payload) => saveSettingsMutation.mutate(payload)}
              saving={saveSettingsMutation.isLoading}
            />
          ))}
      </div>
    </div>
  );
}
