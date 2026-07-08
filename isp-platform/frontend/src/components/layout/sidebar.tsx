import { NavLink } from "react-router-dom";
import {
  AlertTriangle,
  Bot,
  BookOpen,
  Cable,
  Boxes,
  CircleFadingArrowUp,
  ClipboardCheck,
  Gauge,
  HardDrive,
  HeartPulse,
  Megaphone,
  MapPinned,
  Network,
  Rocket,
  ReceiptText,
  Settings,
  Signal,
  Users,
  Wrench,
} from "lucide-react";
import { hasPermission } from "@/lib/permissions";
import { getRoleLabel } from "@/lib/isp";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/map", label: "Map", icon: MapPinned },
  { href: "/customers", label: "CRM", icon: Users, permission: "view_customers" as const },
  { href: "/infrastructure", label: "Infrastructure", icon: Cable },
  { href: "/inventory", label: "Inventory", icon: Boxes, permission: "inventory_access" as const },
  { href: "/finance", label: "Billing & Finance", icon: ReceiptText, permission: "finance_access" as const },
  { href: "/leads", label: "Sales & Leads", icon: Megaphone, permission: "view_customers" as const },
  { href: "/faults", label: "Support & Faults", icon: AlertTriangle },
  { href: "/field", label: "Technicians", icon: Wrench },
  { href: "/network-intelligence", label: "Network IQ", icon: Network, permission: "settings_access" as const },
  { href: "/knowledge-base", label: "Knowledge Base", icon: BookOpen, permission: "settings_access" as const },
  { href: "/approvals", label: "Approvals", icon: ClipboardCheck, permission: "settings_access" as const },
  { href: "/enterprise-readiness", label: "Launch Review", icon: CircleFadingArrowUp, permission: "settings_access" as const },
  { href: "/onboarding", label: "Onboarding", icon: Rocket, permission: "settings_access" as const },
  { href: "/ai-noc", label: "AI NOC", icon: Bot, permission: "settings_access" as const },
  { href: "/system-health", label: "System Health", icon: HeartPulse, permission: "settings_access" as const },
  { href: "/radius", label: "RADIUS", icon: Signal, permission: "radius_access" as const },
  { href: "/settings", label: "Settings", icon: Settings, permission: "settings_access" as const },
];

export function Sidebar() {
  const branding = useAppStore((state) => state.branding);
  const user = useAppStore((state) => state.user);
  const visibleNavItems = navItems.filter((item) => !item.permission || hasPermission(user, item.permission));

  return (
    <aside className="hidden w-72 flex-col border-r border-gray-200 bg-white px-4 py-5 dark:border-border/80 dark:bg-card/90 lg:flex">
      <div className="mb-7 flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-border/80 dark:bg-background/70">
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
          <p className="text-xs text-muted-foreground">{getRoleLabel(user?.role)}</p>
        </div>
      </div>

      <nav className="space-y-1">
        {visibleNavItems.map((item) => {
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
