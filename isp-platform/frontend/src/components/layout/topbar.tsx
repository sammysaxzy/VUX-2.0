"use client";

import { Bell, LogOut, MoonStar, SunMedium } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/store/app-store";

export function Topbar() {
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const logout = useAppStore((state) => state.logout);
  const user = useAppStore((state) => state.user);
  const liveAlerts = useAppStore((state) => state.realtimeAlerts);

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border/70 bg-background/80 px-4 py-3 backdrop-blur-md lg:px-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">NOC Command</p>
        <p className="text-sm font-medium">{user?.fullName ?? "Operator"}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {liveAlerts.length > 0 ? (
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-danger" />
          ) : null}
        </Button>
        <Badge variant="outline">{user?.role?.replace("_", " ") ?? "guest"}</Badge>
        <Button variant="secondary" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={logout}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
