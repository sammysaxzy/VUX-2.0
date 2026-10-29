import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  ArrowUpRight,
  BadgeAlert,
  Bell,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Download,
  FileText,
  Headphones,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Moon,
  Receipt,
  Search,
  Send,
  Sun,
  Ticket,
  UserRound,
  Wallet,
  Wifi,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  usePortalChangePassword,
  usePortalCreatePayment,
  usePortalCreateTicket,
  usePortalNotifications,
  usePortalPayments,
  usePortalPlans,
  usePortalProfile,
  usePortalTickets,
  usePortalUpgradePlan,
  usePortalUsage,
} from "@/hooks/api/use-portal";
import { apiClient } from "@/lib/api/client";
import { getPortalConfig, resolvePortalTenantId } from "@/lib/portal/tenant-config";
import { formatCurrency } from "@/lib/utils";
import type { CustomerPayment, CustomerPortalSession, CustomerTicketCategory } from "@/types";

type PortalSection = "overview" | "profile" | "billing" | "documents" | "support";
type ThemeMode = "light" | "dark";

const sectionItems: Array<{ id: PortalSection; label: string; icon: React.ReactNode }> = [
  { id: "overview", label: "Home", icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "profile", label: "Profile", icon: <UserRound className="h-4 w-4" /> },
  { id: "billing", label: "Recharge", icon: <Wallet className="h-4 w-4" /> },
  { id: "documents", label: "Invoices", icon: <Receipt className="h-4 w-4" /> },
  { id: "support", label: "Support", icon: <Headphones className="h-4 w-4" /> },
];

function readPortalSession(): CustomerPortalSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem("portal-session");
    return raw ? (JSON.parse(raw) as CustomerPortalSession) : null;
  } catch {
    return null;
  }
}

function getInitialThemeMode() {
  if (typeof window === "undefined") return "light" as ThemeMode;
  const saved = window.localStorage.getItem("portal-theme-mode");
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyAlpha(hex: string, alpha: string) {
  return `${hex}${alpha}`;
}

function getThemePalette(base: ReturnType<typeof getPortalConfig>["theme"], mode: ThemeMode) {
  if (mode === "dark") {
    return {
      ...base,
      background: "#08111d",
      surface: "#0f1b2b",
      surfaceMuted: "#132338",
      text: "#eef4ff",
      textMuted: "#9db0c9",
      border: "#223650",
    };
  }
  return base;
}

function formatPortalDate(value?: string) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString();
}

function openPrintableHtmlDocument(html: string) {
  const popup = window.open("", "_blank", "noopener,noreferrer");
  if (!popup) {
    toast.error("Allow popups to print the receipt.");
    return;
  }
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  window.setTimeout(() => popup.print(), 250);
}

function openPdfDocument(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const popup = window.open(url, "_blank", "noopener,noreferrer");
  if (!popup) {
    const link = window.document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
  }
  window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
}

function buildPrintableReceiptHtml(
  payment: CustomerPayment,
  customerName: string,
  customerId: string,
  portalName: string,
  supportEmail: string,
  supportPhone: string,
  paymentInstructions: string | undefined,
  footerInformation: string,
) {
  const createdAt = new Date(payment.createdAt).toLocaleString();
  const receiptNumber = payment.receipt_number ?? payment.reference;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${portalName} Receipt ${receiptNumber}</title>
    <style>
      body { font-family: Manrope, Arial, sans-serif; margin: 0; padding: 24px; background: #eef4fb; color: #0f172a; }
      .wrap { max-width: 760px; margin: 0 auto; background: #fff; border: 1px solid #d8e3f0; border-radius: 22px; overflow: hidden; box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08); }
      .hero { background: linear-gradient(135deg, #60a5fa, #2563eb, #67e8f9); color: #fff; padding: 28px 32px; }
      .hero h1 { margin: 0 0 8px; font-family: Sora, Arial, sans-serif; }
      .hero p { margin: 0; opacity: .94; }
      .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; padding: 24px 32px; }
      .item { border: 1px solid #d8e3f0; border-radius: 14px; padding: 14px 16px; background: #f8fbff; }
      .label { font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: #64748b; margin-bottom: 6px; }
      .value { font-size: 16px; font-weight: 700; color: #0f172a; }
      .summary { padding: 0 32px 32px; }
      .total { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #d8e3f0; padding-top: 20px; color: #2563eb; font-size: 24px; font-weight: 700; }
      .note { color: #64748b; font-size: 13px; margin-top: 16px; line-height: 1.6; }
      @media print { body { padding: 0; background: #fff; } .wrap { border: none; border-radius: 0; max-width: none; box-shadow: none; } }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="hero">
        <h1>${portalName} Payment Receipt</h1>
        <p>${supportPhone} • ${supportEmail}</p>
      </div>
      <div class="meta">
        <div class="item"><div class="label">Customer</div><div class="value">${customerName}</div></div>
        <div class="item"><div class="label">Client ID</div><div class="value">${customerId}</div></div>
        <div class="item"><div class="label">Receipt No.</div><div class="value">${receiptNumber}</div></div>
        <div class="item"><div class="label">Reference</div><div class="value">${payment.reference}</div></div>
        <div class="item"><div class="label">Plan</div><div class="value">${payment.planName}</div></div>
        <div class="item"><div class="label">Payment Method</div><div class="value">${payment.method}</div></div>
        <div class="item"><div class="label">Status</div><div class="value">${payment.status}</div></div>
        <div class="item"><div class="label">Date</div><div class="value">${createdAt}</div></div>
      </div>
      <div class="summary">
        <div class="total"><span>Amount Paid</span><span>${formatCurrency(payment.amount)}</span></div>
        <div class="note">${paymentInstructions ?? "Payment recorded successfully."}</div>
        <div class="note">${footerInformation}</div>
      </div>
    </div>
  </body>
</html>`;
}

export function CustomerPortalPage() {
  const [session, setSession] = useState<CustomerPortalSession | null>(() => readPortalSession());
  const [activeSection, setActiveSection] = useState<PortalSection>("overview");
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getInitialThemeMode());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<CustomerPayment | null>(null);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const [ticketForm, setTicketForm] = useState<{ subject: string; description: string; category: CustomerTicketCategory }>({
    subject: "",
    description: "",
    category: "no internet",
  });
  const [paymentPlanId, setPaymentPlanId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<CustomerPayment["method"]>("paystack");
  const [documentFilter, setDocumentFilter] = useState("");

  const resolvedTenantId = resolvePortalTenantId({
    hostname: typeof window !== "undefined" ? window.location.hostname : "",
    search: typeof window !== "undefined" ? window.location.search : "",
    sessionTenantId: session?.tenant_id,
  });
  const portalConfig = getPortalConfig(resolvedTenantId);
  const theme = getThemePalette(portalConfig.theme, themeMode);
  const token = session?.access_token;
  const customerId = session?.customer_id;

  const profileQuery = usePortalProfile(customerId, token, session?.tenant_id);
  const plansQuery = usePortalPlans(token, session?.tenant_id);
  const ticketsQuery = usePortalTickets(customerId, token, session?.tenant_id);
  const notificationsQuery = usePortalNotifications(customerId, token, session?.tenant_id);
  const paymentsQuery = usePortalPayments(customerId, token, session?.tenant_id);
  const usageQuery = usePortalUsage(customerId, token, session?.tenant_id);
  const createTicketMutation = usePortalCreateTicket(customerId, token, session?.tenant_id);
  const createPaymentMutation = usePortalCreatePayment(customerId, token, session?.tenant_id);
  const upgradePlanMutation = usePortalUpgradePlan(customerId, token, session?.tenant_id);
  const changePasswordMutation = usePortalChangePassword(token);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("portal-theme-mode", themeMode);
    }
  }, [themeMode]);

  if (!session) return <Navigate to="/portal/login" replace />;

  const profile = profileQuery.data;
  const plans = plansQuery.data ?? [];
  const tickets = ticketsQuery.data ?? [];
  const notifications = notificationsQuery.data ?? [];
  const payments = paymentsQuery.data ?? [];
  const usage = usageQuery.data ?? [];
  const latestUsage = usage[0];
  const latestTicket = tickets[0];
  const activePlan = profile?.planName ?? "Unknown plan";
  const openTickets = tickets.filter((ticket) => ticket.status !== "resolved" && ticket.status !== "closed").length;
  const successfulPayments = payments.filter((payment) => payment.status === "success");
  const pendingPayments = payments.filter((payment) => payment.status !== "success");
  const outstandingAmount = pendingPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const nextPayment = pendingPayments[0];
  const unreadNoticeCount = notifications.length;

  const filteredPayments = payments.filter((payment) => {
    const term = documentFilter.trim().toLowerCase();
    if (!term) return true;
    return payment.reference.toLowerCase().includes(term) || payment.planName.toLowerCase().includes(term) || (payment.receipt_number ?? "").toLowerCase().includes(term);
  });

  const daysRemaining = useMemo(() => {
    if (!profile?.expiryDate) return "N/A";
    const expiry = new Date(profile.expiryDate).getTime();
    const remaining = Math.max(0, Math.ceil((expiry - Date.now()) / (1000 * 60 * 60 * 24)));
    return `${remaining} days`;
  }, [profile?.expiryDate]);

  const logout = () => {
    window.sessionStorage.removeItem("portal-session");
    setSession(null);
  };

  const triggerPaymentRequest = (planId: string) => {
    createPaymentMutation.mutate(
      { planId, method: paymentMethod },
      {
        onSuccess: (payment) => {
          setSelectedPayment(payment);
          if (payment.checkout_url) {
            window.open(payment.checkout_url, "_blank", "noopener,noreferrer");
          } else {
            toast.success(`Payment request ${payment.reference} created.`);
          }
        },
      },
    );
  };

  return (
    <div className="portal-ui min-h-screen" style={{ background: `radial-gradient(circle at top left, ${applyAlpha(theme.heroFrom, "20")}, transparent 24%), radial-gradient(circle at top right, ${applyAlpha(theme.heroTo, "22")}, transparent 22%), ${theme.background}` }}>
      <div className="sticky top-0 z-30 border-b backdrop-blur" style={{ borderColor: applyAlpha(theme.border, "AA"), backgroundColor: applyAlpha(theme.background, "E6") }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setMobileMenuOpen(true)} className="rounded-2xl p-2 xl:hidden" style={{ backgroundColor: theme.surface, color: theme.text }}>
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-semibold text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${theme.heroFrom}, ${theme.heroVia})` }}>
              {portalConfig.portalName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: theme.primary }}>{portalConfig.portalName}</p>
              <p className="text-sm font-medium" style={{ color: theme.text }}>{profile?.name ?? session.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setThemeMode((current) => (current === "light" ? "dark" : "light"))} className="rounded-2xl p-2" style={{ backgroundColor: theme.surface, color: theme.text }}>
              {themeMode === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>
            <button type="button" className="rounded-2xl p-2" style={{ backgroundColor: theme.surface, color: theme.text }}>
              <Bell className="h-5 w-5" />
            </button>
            <button type="button" onClick={logout} className="rounded-2xl p-2" style={{ backgroundColor: theme.surface, color: theme.text }}>
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-40 xl:hidden">
          <div className="absolute inset-0 bg-slate-950/45" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative h-full w-[84%] max-w-sm p-4" style={{ backgroundColor: theme.surface }}>
            <div className="rounded-[2rem] p-5 text-white" style={{ background: `linear-gradient(135deg, ${theme.heroFrom}, ${theme.heroVia}, ${theme.heroTo})` }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-white/70">{portalConfig.portalName}</p>
                  <p className="portal-display mt-3 text-2xl font-semibold">{profile?.name ?? session.username}</p>
                  <p className="mt-1 text-sm text-white/80">{session.username}</p>
                </div>
                <button type="button" onClick={() => setMobileMenuOpen(false)}>
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="mt-5 space-y-2">
              {sectionItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveSection(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-[1.3rem] px-4 py-4 text-left text-base font-medium"
                  style={{ backgroundColor: activeSection === item.id ? theme.surfaceMuted : "transparent", color: theme.text }}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 md:px-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden xl:block">
          <div className="rounded-[2rem] p-5 text-white shadow-[0_20px_50px_rgba(37,99,235,0.18)]" style={{ background: `linear-gradient(145deg, ${theme.heroFrom}, ${theme.heroVia}, ${theme.heroTo})` }}>
            <p className="text-xs uppercase tracking-[0.25em] text-white/70">{portalConfig.portalName}</p>
            <h2 className="portal-display mt-3 text-3xl font-semibold">{profile?.name ?? session.username}</h2>
            <p className="mt-2 text-sm text-white/80">{portalConfig.portalSubtitle}</p>
          </div>
          <div className="mt-4 rounded-[2rem] border p-3" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
            {sectionItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className="mb-2 flex w-full items-center gap-3 rounded-[1.2rem] px-4 py-3 text-left text-sm font-medium last:mb-0"
                style={{ backgroundColor: activeSection === item.id ? theme.surfaceMuted : "transparent", color: activeSection === item.id ? theme.primary : theme.text }}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </aside>

        <main className="space-y-5">
          <section className="overflow-hidden rounded-[2rem] border shadow-[0_24px_60px_rgba(15,23,42,0.08)]" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
            <div className="relative p-5 md:p-7" style={{ background: `linear-gradient(135deg, ${applyAlpha(theme.heroFrom, "22")}, ${applyAlpha(theme.heroTo, "12")})` }}>
              <div className="absolute right-0 top-0 h-40 w-40 rounded-full blur-3xl" style={{ backgroundColor: applyAlpha(theme.heroVia, "30") }} />
              <div className="relative flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="max-w-3xl">
                  <p className="text-sm font-medium" style={{ color: theme.textMuted }}>Good evening</p>
                  <h1 className="portal-display mt-2 text-3xl font-semibold leading-tight md:text-5xl" style={{ color: theme.text }}>
                    Everything your customer needs, without the clutter.
                  </h1>
                  <p className="mt-4 text-sm leading-7 md:text-base" style={{ color: theme.textMuted }}>
                    {portalConfig.welcomeMessage}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="rounded-full px-4 py-2 text-sm text-white hover:opacity-100" style={{ backgroundColor: profile?.status === "active" ? theme.success : theme.warning }}>
                    {profile?.status === "active" ? "Online" : profile?.status ?? "Unknown"}
                  </Badge>
                  <Badge className="rounded-full px-4 py-2 text-sm" variant="outline">{daysRemaining} left</Badge>
                </div>
              </div>
              <div className="relative mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <HeroMetric title="Current plan" value={activePlan} subtitle={`${profile?.speedMbps ?? 0} Mbps service`} theme={theme} icon={<Wifi className="h-5 w-5" />} />
                <HeroMetric title="Outstanding" value={formatCurrency(outstandingAmount)} subtitle={nextPayment ? `Next ref ${nextPayment.reference}` : "No pending payment"} theme={theme} icon={<Wallet className="h-5 w-5" />} />
                <HeroMetric title="Open tickets" value={String(openTickets)} subtitle={latestTicket?.subject ?? "No active support issues"} theme={theme} icon={<Ticket className="h-5 w-5" />} />
                <HeroMetric title="Notices" value={String(unreadNoticeCount)} subtitle={portalConfig.announcement ?? "No critical announcement"} theme={theme} icon={<Bell className="h-5 w-5" />} />
              </div>
            </div>
          </section>

          {session.first_login_required ? (
            <Card style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
              <CardHeader>
                <CardTitle style={{ color: theme.text }}>Change Temporary Password</CardTitle>
                <CardDescription style={{ color: theme.textMuted }}>Update your temporary password before using the rest of the portal.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <Field label="Current Password" theme={theme}>
                  <Input type="password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} />
                </Field>
                <Field label="New Password" theme={theme}>
                  <Input type="password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))} />
                </Field>
                <div className="flex items-end">
                  <Button
                    disabled={changePasswordMutation.isPending || !passwordForm.currentPassword || !passwordForm.newPassword}
                    onClick={() =>
                      changePasswordMutation.mutate(
                        { currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword },
                        {
                          onSuccess: () => {
                            const nextSession = { ...session, first_login_required: false };
                            setSession(nextSession);
                            window.sessionStorage.setItem("portal-session", JSON.stringify(nextSession));
                            setPasswordForm({ currentPassword: "", newPassword: "" });
                          },
                        },
                      )
                    }
                    className="text-white"
                    style={{ backgroundColor: theme.primary }}
                  >
                    {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <div className="flex gap-2 overflow-x-auto pb-1 xl:hidden">
            {sectionItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className="shrink-0 rounded-full px-4 py-2 text-sm font-medium"
                style={{ backgroundColor: activeSection === item.id ? theme.primary : theme.surface, color: activeSection === item.id ? "#ffffff" : theme.text, border: `1px solid ${theme.border}` }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {activeSection === "overview" ? (
            <section className="space-y-5">
              <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <Card style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
                  <CardHeader>
                    <CardTitle style={{ color: theme.text }}>Quick Actions</CardTitle>
                    <CardDescription style={{ color: theme.textMuted }}>Focused actions designed for one-hand use on phones.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2">
                    <QuickActionCard title="Renew Subscription" body="Create a payment request for your active plan." icon={<CreditCard className="h-5 w-5" />} theme={theme} onClick={() => setActiveSection("billing")} />
                    <QuickActionCard title="Print Receipt" body="Print a branded receipt for any successful payment." icon={<Receipt className="h-5 w-5" />} theme={theme} onClick={() => setActiveSection("documents")} />
                    <QuickActionCard title="Report Problem" body="Open a support complaint directly from your account." icon={<BadgeAlert className="h-5 w-5" />} theme={theme} onClick={() => setActiveSection("support")} />
                    <QuickActionCard title="View Profile" body="See your account details, plan info, and contact data." icon={<UserRound className="h-5 w-5" />} theme={theme} onClick={() => setActiveSection("profile")} />
                  </CardContent>
                </Card>
                <Card style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
                  <CardHeader>
                    <CardTitle style={{ color: theme.text }}>Recent Activity</CardTitle>
                    <CardDescription style={{ color: theme.textMuted }}>Latest account and service information at a glance.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {successfulPayments[0] ? <SuccessBanner title="Latest payment confirmed" body={`Receipt ${successfulPayments[0].receipt_number ?? successfulPayments[0].reference} was recorded successfully for ${successfulPayments[0].planName}.`} theme={theme} /> : null}
                    <InfoRow label="Latest usage" value={latestUsage ? `${latestUsage.usedGb} GB` : "No usage record"} theme={theme} />
                    <InfoRow label="Data cap" value={latestUsage?.capGb ? `${latestUsage.capGb} GB` : "Open"} theme={theme} />
                    <InfoRow label="Latest ticket" value={latestTicket?.subject ?? "No recent ticket"} theme={theme} />
                    <InfoRow label="Current notice" value={notifications[0]?.title ?? "No current notice"} theme={theme} />
                  </CardContent>
                </Card>
              </div>
            </section>
          ) : null}

          {activeSection === "profile" ? (
            <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
              <Card style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
                <CardHeader>
                  <CardTitle style={{ color: theme.text }}>Account Snapshot</CardTitle>
                  <CardDescription style={{ color: theme.textMuted }}>A cleaner customer profile layout with more visual hierarchy.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <ProfileSpotlight title="Customer ID" value={session.username} note="Tenant-safe login identity" theme={theme} />
                  <ProfileSpotlight title="Customer Name" value={profile?.name ?? "Customer"} note="Primary profile record" theme={theme} />
                  <ProfileSpotlight title="Current Plan" value={activePlan} note={`${profile?.speedMbps ?? 0} Mbps service`} theme={theme} />
                  <ProfileSpotlight title="Service Status" value={profile?.status ?? "unknown"} note={`Expiry ${profile?.expiryDate ? new Date(profile.expiryDate).toLocaleDateString() : "N/A"}`} theme={theme} />
                </CardContent>
              </Card>
              <Card style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
                <CardHeader>
                  <CardTitle style={{ color: theme.text }}>Contact & Support</CardTitle>
                  <CardDescription style={{ color: theme.textMuted }}>Tenant-specific support and portal contact information.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <DetailCard label="Support Phone" value={portalConfig.supportPhone} theme={theme} />
                  <DetailCard label="Support Email" value={portalConfig.supportEmail} theme={theme} />
                  <DetailCard label="Website" value={portalConfig.website ?? "Not available"} theme={theme} />
                  <DetailCard label="Office Address" value={portalConfig.officeAddress ?? "Not available"} theme={theme} />
                </CardContent>
              </Card>
            </section>
          ) : null}

          {activeSection === "billing" ? (
            <section className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                <SummaryStat title="Outstanding" value={formatCurrency(outstandingAmount)} note={outstandingAmount > 0 ? "Awaiting payment" : "All caught up"} theme={theme} />
                <SummaryStat title="Latest receipt" value={successfulPayments[0]?.receipt_number ?? "None yet"} note={successfulPayments[0]?.reference ?? "No successful payment yet"} theme={theme} />
                <SummaryStat title="Support line" value={portalConfig.supportPhone} note="Billing and renewal help" theme={theme} />
              </div>
              <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                <Card style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
                  <CardHeader>
                    <CardTitle style={{ color: theme.text }}>Recharge & Make Payment</CardTitle>
                    <CardDescription style={{ color: theme.textMuted }}>Select a plan and payment method to renew or recharge your service.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      {plans.map((plan) => (
                        <div key={plan.id} className="rounded-[1.5rem] border p-4" style={{ borderColor: theme.border, backgroundColor: theme.surfaceMuted }}>
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold" style={{ color: theme.text }}>{plan.name}</p>
                            {plan.recommended ? <Badge variant="success">Recommended</Badge> : null}
                          </div>
                          <p className="mt-2 text-sm" style={{ color: theme.textMuted }}>{plan.description}</p>
                          <p className="portal-display mt-4 text-2xl font-semibold" style={{ color: theme.text }}>{formatCurrency(plan.priceMonthly)}</p>
                          <p className="text-sm" style={{ color: theme.textMuted }}>{plan.speedMbps} Mbps monthly plan</p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button onClick={() => triggerPaymentRequest(plan.id)} disabled={createPaymentMutation.isPending} className="text-white" style={{ backgroundColor: theme.primary }}>Recharge</Button>
                            <Button variant="outline" onClick={() => upgradePlanMutation.mutate({ planId: plan.id })} disabled={upgradePlanMutation.isPending}>Upgrade</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
                      <Field label="Payment Method" theme={theme}>
                        <Select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as CustomerPayment["method"])}>
                          <option value="paystack">paystack</option>
                          <option value="flutterwave">flutterwave</option>
                          <option value="stripe">stripe</option>
                        </Select>
                      </Field>
                      <Field label="Quick Plan" theme={theme}>
                        <Select value={paymentPlanId} onChange={(event) => setPaymentPlanId(event.target.value)}>
                          <option value="">Select plan</option>
                          {plans.map((plan) => (
                            <option key={plan.id} value={plan.id}>{plan.name}</option>
                          ))}
                        </Select>
                      </Field>
                      <div className="flex items-end">
                        <Button disabled={!paymentPlanId || createPaymentMutation.isPending} onClick={() => triggerPaymentRequest(paymentPlanId)} className="w-full text-white md:w-auto" style={{ backgroundColor: theme.primary }}>
                          Pay Now
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
                  <CardHeader>
                    <CardTitle style={{ color: theme.text }}>Billing Overview</CardTitle>
                    <CardDescription style={{ color: theme.textMuted }}>Track pending and successful payments on your account.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {outstandingAmount > 0 ? <WarningBanner title="Pending recharge" body={`You currently have ${formatCurrency(outstandingAmount)} awaiting payment confirmation.`} theme={theme} /> : <SuccessBanner title="Billing is up to date" body="There are no outstanding recharge requests on this account right now." theme={theme} />}
                    {pendingPayments.length ? pendingPayments.slice(0, 4).map((payment) => (
                      <TimelineRow key={payment.id} title={payment.reference} subtitle={`Pending ${payment.planName}`} right={formatCurrency(payment.amount)} theme={theme} />
                    )) : <EmptyState title="No pending recharges" body="You don't have any outstanding recharge request." icon={<CreditCard className="h-5 w-5" />} theme={theme} />}
                  </CardContent>
                </Card>
              </div>
            </section>
          ) : null}

          {activeSection === "documents" ? (
            <section className="space-y-5">
              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <Card style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
                  <CardHeader>
                    <CardTitle style={{ color: theme.text }}>Invoice & Receipt Studio</CardTitle>
                    <CardDescription style={{ color: theme.textMuted }}>Search, open, print, and download customer payment documents from a richer mobile-friendly document view.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3 rounded-[1.25rem] border px-4 py-3" style={{ borderColor: theme.border, backgroundColor: theme.surfaceMuted }}>
                      <Search className="h-4 w-4" style={{ color: theme.textMuted }} />
                      <Input
                        value={documentFilter}
                        onChange={(event) => setDocumentFilter(event.target.value)}
                        placeholder="Search by reference, plan, or receipt number"
                        className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                      />
                    </div>
                    <div className="grid gap-3">
                      {paymentsQuery.isLoading ? (
                        <PageSkeleton />
                      ) : filteredPayments.length ? (
                        filteredPayments.map((payment) => (
                          <DocumentCard
                            key={payment.id}
                            payment={payment}
                            theme={theme}
                            onOpen={() => setSelectedPayment(payment)}
                            onInvoice={async () => {
                              try {
                                const pdf = await apiClient.getPortalPaymentInvoicePdf(customerId as string, payment.id, token);
                                openPdfDocument(pdf, `${payment.invoice_number ?? payment.reference}-invoice.pdf`);
                              } catch {
                                toast.error("Invoice is not available right now.");
                              }
                            }}
                            onPrint={() =>
                              openPrintableHtmlDocument(
                                buildPrintableReceiptHtml(
                                  payment,
                                  profile?.name ?? "Customer",
                                  session.username,
                                  portalConfig.portalName,
                                  portalConfig.supportEmail,
                                  portalConfig.supportPhone,
                                  portalConfig.paymentInstructions,
                                  portalConfig.footerInformation,
                                ),
                              )
                            }
                          />
                        ))
                      ) : (
                        <EmptyState title="No documents found" body="No invoices or receipts match your current filter." icon={<Receipt className="h-5 w-5" />} theme={theme} />
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Card style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
                  <CardHeader>
                    <CardTitle style={{ color: theme.text }}>Document Notes</CardTitle>
                    <CardDescription style={{ color: theme.textMuted }}>Guidance for invoices, receipts, and payment proof.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <InfoPanel title="Document centre" body="Use this workspace to open invoice details, download receipt copies, and print branded payment proof." icon={<FileText className="h-5 w-5" />} theme={theme} />
                    <TimelineRow title="Invoices" subtitle="Download generated billing documents for any payment reference." right="PDF" theme={theme} />
                    <TimelineRow title="Receipts" subtitle="Print branded proof of payment after a successful transaction." right="Print" theme={theme} />
                    <TimelineRow title="Need help?" subtitle={`${portalConfig.supportPhone} • ${portalConfig.supportEmail}`} right="Support" theme={theme} />
                  </CardContent>
                </Card>
              </div>
            </section>
          ) : null}

          {activeSection === "support" ? (
            <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <Card style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
                <CardHeader>
                  <CardTitle style={{ color: theme.text }}>Support Conversation</CardTitle>
                  <CardDescription style={{ color: theme.textMuted }}>A more chat-like support experience for the customer MVP.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 rounded-[1.5rem] border p-4" style={{ borderColor: theme.border, backgroundColor: theme.surfaceMuted }}>
                    {tickets.length ? tickets.slice(0, 3).map((ticket) => (
                      <ChatTicketBubble key={ticket.id} ticket={ticket} theme={theme} />
                    )) : (
                      <EmptyState title="No conversations yet" body="Start a support conversation by sending a complaint below." icon={<MessageSquareText className="h-5 w-5" />} theme={theme} />
                    )}
                  </div>
                  <div className="grid gap-3">
                    <Field label="Subject" theme={theme}>
                      <Input value={ticketForm.subject} onChange={(event) => setTicketForm((current) => ({ ...current, subject: event.target.value }))} />
                    </Field>
                    <Field label="Category" theme={theme}>
                      <Select value={ticketForm.category} onChange={(event) => setTicketForm((current) => ({ ...current, category: event.target.value as CustomerTicketCategory }))}>
                        <option value="no internet">no internet</option>
                        <option value="slow speed">slow speed</option>
                        <option value="billing">billing</option>
                        <option value="other">other</option>
                      </Select>
                    </Field>
                    <Field label="Message" theme={theme}>
                      <Textarea className="min-h-32" value={ticketForm.description} onChange={(event) => setTicketForm((current) => ({ ...current, description: event.target.value }))} />
                    </Field>
                    <Button onClick={() => createTicketMutation.mutate(ticketForm, { onSuccess: () => setTicketForm({ subject: "", description: "", category: "no internet" }) })} disabled={createTicketMutation.isPending} className="text-white" style={{ backgroundColor: theme.primary }}>
                      <Send className="mr-2 h-4 w-4" />
                      {createTicketMutation.isPending ? "Sending..." : "Send Message"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <Card style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
                <CardHeader>
                  <CardTitle style={{ color: theme.text }}>Support Updates</CardTitle>
                  <CardDescription style={{ color: theme.textMuted }}>Current support activity and recent network messages.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!tickets.length ? <InfoPanel title="Support is ready" body="No active complaints at the moment. You can still open a new issue below if you need assistance." icon={<Headphones className="h-5 w-5" />} theme={theme} /> : null}
                  {notifications.length ? notifications.slice(0, 3).map((item) => (
                    <TimelineRow key={item.id} title={item.title} subtitle={item.message} right={item.severity} theme={theme} />
                  )) : <EmptyState title="No support notices" body="There are no support broadcasts or outage notices at the moment." icon={<Bell className="h-5 w-5" />} theme={theme} />}
                </CardContent>
              </Card>
            </section>
          ) : null}

          <footer className="pb-24 pt-2 text-center text-sm xl:pb-6" style={{ color: theme.textMuted }}>
            <p>{portalConfig.footerInformation}</p>
            <p className="mt-1">{portalConfig.officeAddress}</p>
            <p className="mt-1">VUX Portal MVP • Saturday, August 8, 2026</p>
          </footer>
        </main>
      </div>

      <Dialog
        open={Boolean(selectedPayment)}
        onOpenChange={(open) => {
          if (!open) setSelectedPayment(null);
        }}
        title={selectedPayment ? `Payment ${selectedPayment.reference}` : "Payment"}
        description="Review invoice, receipt, and printable proof in a dedicated document workspace."
      >
        {selectedPayment ? (
          <div className="space-y-4">
            <div className="rounded-[1.5rem] border p-4" style={{ borderColor: theme.border, background: `linear-gradient(135deg, ${applyAlpha(theme.heroFrom, "18")}, ${applyAlpha(theme.heroTo, "14")})` }}>
              <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: theme.primary }}>Document Preview</p>
              <h3 className="portal-display mt-2 text-2xl font-semibold" style={{ color: theme.text }}>{portalConfig.portalName} Payment Record</h3>
              <p className="mt-2 text-sm leading-6" style={{ color: theme.textMuted }}>This payment workspace gives the customer access to invoice download, receipt download, and branded print-ready proof.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <DetailCard label="Reference" value={selectedPayment.reference} theme={theme} />
              <DetailCard label="Plan" value={selectedPayment.planName} theme={theme} />
              <DetailCard label="Amount" value={formatCurrency(selectedPayment.amount)} theme={theme} />
              <DetailCard label="Status" value={selectedPayment.status} theme={theme} />
              <DetailCard label="Method" value={selectedPayment.method} theme={theme} />
              <DetailCard label="Receipt No." value={selectedPayment.receipt_number ?? "Not issued"} theme={theme} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const pdf = await apiClient.getPortalPaymentInvoicePdf(customerId as string, selectedPayment.id, token);
                    openPdfDocument(pdf, `${selectedPayment.invoice_number ?? selectedPayment.reference}-invoice.pdf`);
                  } catch {
                    toast.error("Invoice is not available right now.");
                  }
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Download Invoice
              </Button>
              <Button
                variant="outline"
                disabled={selectedPayment.status !== "success"}
                onClick={async () => {
                  try {
                    const pdf = await apiClient.getPortalPaymentReceiptPdf(customerId as string, selectedPayment.id, token);
                    openPdfDocument(pdf, `${selectedPayment.receipt_number ?? selectedPayment.reference}-receipt.pdf`);
                  } catch {
                    toast.error("Receipt is not available yet.");
                  }
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Download Receipt
              </Button>
              <Button
                disabled={selectedPayment.status !== "success"}
                className="text-white"
                style={{ backgroundColor: theme.primary }}
                onClick={() =>
                  openPrintableHtmlDocument(
                    buildPrintableReceiptHtml(
                      selectedPayment,
                      profile?.name ?? "Customer",
                      session.username,
                      portalConfig.portalName,
                      portalConfig.supportEmail,
                      portalConfig.supportPhone,
                      portalConfig.paymentInstructions,
                      portalConfig.footerInformation,
                    ),
                  )
                }
              >
                <Receipt className="mr-2 h-4 w-4" />
                Print Receipt
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

function Field({ label, children, theme }: { label: string; children: React.ReactNode; theme: ReturnType<typeof getThemePalette> }) {
  return (
    <div className="space-y-1">
      <Label style={{ color: theme.text }}>{label}</Label>
      {children}
    </div>
  );
}

function HeroMetric({ title, value, subtitle, theme, icon }: { title: string; value: string; subtitle: string; theme: ReturnType<typeof getThemePalette>; icon: React.ReactNode }) {
  return (
    <div className="rounded-[1.5rem] border p-4" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
      <div className="flex items-center gap-2" style={{ color: theme.primary }}>{icon}<p className="text-sm font-medium">{title}</p></div>
      <p className="portal-display mt-3 text-2xl font-semibold" style={{ color: theme.text }}>{value}</p>
      <p className="mt-1 text-sm" style={{ color: theme.textMuted }}>{subtitle}</p>
    </div>
  );
}

function QuickActionCard({ title, body, icon, theme, onClick }: { title: string; body: string; icon: React.ReactNode; theme: ReturnType<typeof getThemePalette>; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-[1.5rem] border p-4 text-left transition hover:-translate-y-[1px]" style={{ borderColor: theme.border, backgroundColor: theme.surfaceMuted }}>
      <div className="flex items-center gap-2" style={{ color: theme.primary }}>{icon}<p className="font-semibold">{title}</p></div>
      <p className="mt-2 text-sm leading-6" style={{ color: theme.textMuted }}>{body}</p>
    </button>
  );
}

function InfoRow({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof getThemePalette> }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-[1.2rem] border px-4 py-3" style={{ borderColor: theme.border, backgroundColor: theme.surfaceMuted }}>
      <span className="text-sm" style={{ color: theme.textMuted }}>{label}</span>
      <span className="max-w-[55%] text-right text-sm font-medium" style={{ color: theme.text }}>{value}</span>
    </div>
  );
}

function DetailCard({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof getThemePalette> }) {
  return (
    <div className="rounded-[1.4rem] border p-4" style={{ borderColor: theme.border, backgroundColor: theme.surfaceMuted }}>
      <p className="text-xs uppercase tracking-[0.18em]" style={{ color: theme.textMuted }}>{label}</p>
      <p className="mt-2 text-sm font-medium leading-6" style={{ color: theme.text }}>{value}</p>
    </div>
  );
}

function ProfileSpotlight({ title, value, note, theme }: { title: string; value: string; note: string; theme: ReturnType<typeof getThemePalette> }) {
  return (
    <div className="rounded-[1.6rem] border p-5" style={{ borderColor: theme.border, backgroundColor: theme.surfaceMuted }}>
      <p className="text-xs uppercase tracking-[0.18em]" style={{ color: theme.textMuted }}>{title}</p>
      <p className="portal-display mt-3 text-2xl font-semibold" style={{ color: theme.text }}>{value}</p>
      <p className="mt-2 text-sm leading-6" style={{ color: theme.textMuted }}>{note}</p>
    </div>
  );
}

function SummaryStat({ title, value, note, theme }: { title: string; value: string; note: string; theme: ReturnType<typeof getThemePalette> }) {
  return (
    <Card style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
      <CardContent className="pt-5">
        <p className="text-sm font-medium" style={{ color: theme.textMuted }}>{title}</p>
        <p className="portal-display mt-2 text-2xl font-semibold" style={{ color: theme.text }}>{value}</p>
        <p className="mt-1 text-sm" style={{ color: theme.textMuted }}>{note}</p>
      </CardContent>
    </Card>
  );
}

function TimelineRow({ title, subtitle, right, theme }: { title: string; subtitle: string; right: string; theme: ReturnType<typeof getThemePalette> }) {
  return (
    <div className="rounded-[1.35rem] border p-4" style={{ borderColor: theme.border, backgroundColor: theme.surfaceMuted }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold" style={{ color: theme.text }}>{title}</p>
          <p className="mt-1 text-sm leading-6" style={{ color: theme.textMuted }}>{subtitle}</p>
        </div>
        <span className="shrink-0 rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: applyAlpha(theme.primary, "14"), color: theme.primary }}>{right}</span>
      </div>
    </div>
  );
}

function DocumentCard({
  payment,
  theme,
  onOpen,
  onInvoice,
  onPrint,
}: {
  payment: CustomerPayment;
  theme: ReturnType<typeof getThemePalette>;
  onOpen: () => void;
  onInvoice: () => void;
  onPrint: () => void;
}) {
  return (
    <div className="rounded-[1.6rem] border p-4" style={{ borderColor: theme.border, backgroundColor: theme.surfaceMuted }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold" style={{ color: theme.text }}>{payment.reference}</p>
          <p className="mt-1 text-sm" style={{ color: theme.textMuted }}>{payment.planName}</p>
        </div>
        <Badge variant={payment.status === "success" ? "success" : payment.status === "failed" ? "danger" : "warning"}>
          {payment.status}
        </Badge>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <MiniMeta label="Amount" value={formatCurrency(payment.amount)} theme={theme} />
        <MiniMeta label="Method" value={payment.method} theme={theme} />
        <MiniMeta label="Receipt" value={payment.receipt_number ?? "Not issued"} theme={theme} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" onClick={onOpen}>
          <Search className="mr-2 h-4 w-4" />
          Open
        </Button>
        <Button variant="outline" onClick={onInvoice}>
          <FileText className="mr-2 h-4 w-4" />
          Invoice
        </Button>
        <Button variant="outline" disabled={payment.status !== "success"} onClick={onPrint}>
          <Receipt className="mr-2 h-4 w-4" />
          Print
        </Button>
      </div>
    </div>
  );
}

function MiniMeta({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof getThemePalette> }) {
  return (
    <div className="rounded-[1rem] border px-3 py-2" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
      <p className="text-[11px] uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>{label}</p>
      <p className="mt-1 text-sm font-medium" style={{ color: theme.text }}>{value}</p>
    </div>
  );
}

function ChatTicketBubble({ ticket, theme }: { ticket: { subject: string; description: string; status: string }; theme: ReturnType<typeof getThemePalette> }) {
  return (
    <div className="space-y-2">
      <div className="mr-10 rounded-[1.4rem] rounded-bl-md px-4 py-3" style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}>
        <p className="font-semibold" style={{ color: theme.text }}>{ticket.subject}</p>
        <p className="mt-1 text-sm leading-6" style={{ color: theme.textMuted }}>{ticket.description}</p>
      </div>
      <div className="ml-10 rounded-[1.4rem] rounded-br-md px-4 py-3 text-white" style={{ background: `linear-gradient(135deg, ${theme.heroVia}, ${theme.primary})` }}>
        <p className="text-sm font-medium">Support status: {ticket.status}</p>
        <p className="mt-1 text-sm text-white/80">Our support team is tracking this request in your portal timeline.</p>
      </div>
    </div>
  );
}

function EmptyState({ title, body, icon, theme }: { title: string; body: string; icon: React.ReactNode; theme: ReturnType<typeof getThemePalette> }) {
  return (
    <div className="rounded-[1.5rem] border p-5 text-center" style={{ borderColor: theme.border, backgroundColor: theme.surfaceMuted }}>
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: applyAlpha(theme.primary, "14"), color: theme.primary }}>{icon}</div>
      <p className="mt-3 font-semibold" style={{ color: theme.text }}>{title}</p>
      <p className="mt-2 text-sm leading-6" style={{ color: theme.textMuted }}>{body}</p>
    </div>
  );
}

function SuccessBanner({ title, body, theme }: { title: string; body: string; theme: ReturnType<typeof getThemePalette> }) {
  return (
    <div className="rounded-[1.35rem] border p-4" style={{ borderColor: `${theme.success}44`, backgroundColor: `${theme.success}12` }}>
      <div className="flex items-center gap-2" style={{ color: theme.success }}>
        <CheckCircle2 className="h-4 w-4" />
        <p className="font-semibold" style={{ color: theme.text }}>{title}</p>
      </div>
      <p className="mt-1 text-sm leading-6" style={{ color: theme.textMuted }}>{body}</p>
    </div>
  );
}

function WarningBanner({ title, body, theme }: { title: string; body: string; theme: ReturnType<typeof getThemePalette> }) {
  return (
    <div className="rounded-[1.35rem] border p-4" style={{ borderColor: `${theme.warning}44`, backgroundColor: `${theme.warning}12` }}>
      <div className="flex items-center gap-2" style={{ color: theme.warning }}>
        <BadgeAlert className="h-4 w-4" />
        <p className="font-semibold" style={{ color: theme.text }}>{title}</p>
      </div>
      <p className="mt-1 text-sm leading-6" style={{ color: theme.textMuted }}>{body}</p>
    </div>
  );
}

function InfoPanel({ title, body, icon, theme }: { title: string; body: string; icon: React.ReactNode; theme: ReturnType<typeof getThemePalette> }) {
  return (
    <div className="rounded-[1.35rem] border p-4" style={{ borderColor: theme.border, backgroundColor: theme.surfaceMuted }}>
      <div className="flex items-center gap-2" style={{ color: theme.primary }}>{icon}<p className="font-semibold">{title}</p></div>
      <p className="mt-2 text-sm leading-6" style={{ color: theme.textMuted }}>{body}</p>
    </div>
  );
}
