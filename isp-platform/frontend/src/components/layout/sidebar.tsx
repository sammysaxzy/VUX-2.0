import { NavLink } from "react-router-dom";
import {
  AlertTriangle,
  Cable,
  Gauge,
  HardDrive,
  MapPinned,
  Settings,
  Signal,
  Users,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/map", label: "Map", icon: MapPinned },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/infrastructure", label: "Infrastructure", icon: Cable },
  { href: "/faults", label: "Faults", icon: AlertTriangle },
  { href: "/field", label: "Field Team", icon: Wrench },
  { href: "/radius", label: "RADIUS", icon: Signal },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const branding = useAppStore((state) => state.branding);

  return (
    <aside className="hidden w-72 flex-col border-r border-border/80 bg-card/90 px-4 py-5 lg:flex">
      <div className="mb-7 flex items-center gap-3 rounded-2xl border border-border/80 bg-background/70 p-3">
        {branding?.logoUrl ? (
          <img src={branding.logoUrl} alt="Tenant logo" className="h-10 w-10 rounded-xl object-cover" />
        ) : (
          <div className="grid h-10 w-10 place-content-center rounded-xl bg-primary/15 text-primary">
            <HardDrive className="h-5 w-5" />
          </div>
        )}
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Tenant</p>
          <h1 className="font-semibold">{branding?.ispName ?? "ISP Workspace"}</h1>
        </div>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-innerGlow"
                    : "text-muted-foreground hover:bg-muted/30 hover:text-foreground",
                )
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
