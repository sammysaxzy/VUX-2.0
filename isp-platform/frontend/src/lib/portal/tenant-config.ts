import type { PortalFeatureFlags, TenantPortalConfig } from "@/types";

const defaultFeatures = (overrides: Partial<PortalFeatureFlags> = {}): PortalFeatureFlags => ({
  payments: true,
  invoices: true,
  supportTickets: true,
  supportChat: false,
  marketplace: false,
  outages: true,
  usage: true,
  planChanges: true,
  technicianBooking: false,
  deviceInfo: false,
  documents: false,
  announcements: true,
  referrals: false,
  ...overrides,
});

export const portalTenantConfigs: Record<string, TenantPortalConfig> = {
  "tenant-west-001": {
    tenantId: "tenant-west-001",
    slug: "jude",
    portalName: "Jude ISP Self Care",
    portalTitle: "Jude ISP Customer Portal",
    portalSubtitle: "Fast self-service for renewals, support, and service visibility.",
    customerIdPrefix: "JUD",
    fallbackSubdomain: "jude.vux.ng",
    customDomains: ["portal.judeisp.com"],
    supportPhone: "+234 802 JUDE ISP",
    supportWhatsApp: "+234 802 000 0111",
    supportEmail: "support@judeisp.example",
    website: "https://portal.judeisp.example",
    officeAddress: "Lekki Phase 1, Lagos, Nigeria",
    welcomeMessage: "Welcome back to Jude ISP. Manage your service, payments, and support from one secure portal.",
    supportMessage: "Our customer care team is available for billing, outage, and installation assistance.",
    footerInformation: "Jude ISP Customer Portal. Powered by VUX.",
    loginAppearance: "Soft gradient hero with glass login card",
    dashboardAppearance: "Bank-style dashboard with high-clarity cards",
    template: "modern",
    themeMode: "light",
    showPoweredByVux: true,
    marketplaceName: "Jude ISP Store",
    paymentInstructions: "You can pay securely with card or transfer. Successful payments queue service renewal automatically.",
    announcement: "Scheduled maintenance for Lekki Phase 1 will run from 1:00 AM to 3:00 AM on August 10, 2026.",
    socialLinks: [
      { label: "Instagram", url: "https://instagram.example/judeisp" },
      { label: "X", url: "https://x.example/judeisp" },
    ],
    theme: {
      primary: "#1d4ed8",
      secondary: "#0f766e",
      accent: "#38bdf8",
      background: "#eef4fb",
      surface: "#ffffff",
      surfaceMuted: "#f8fbff",
      text: "#1e3a5f",
      textMuted: "#64748b",
      border: "#d8e3f0",
      success: "#16a34a",
      warning: "#d97706",
      danger: "#dc2626",
      heroFrom: "#60a5fa",
      heroVia: "#2563eb",
      heroTo: "#67e8f9",
    },
    features: defaultFeatures({
      supportChat: true,
      marketplace: true,
      technicianBooking: true,
      deviceInfo: true,
    }),
  },
  "tenant-north-002": {
    tenantId: "tenant-north-002",
    slug: "fibrehub",
    portalName: "FibreHub Self Service",
    portalTitle: "FibreHub Customer Portal",
    portalSubtitle: "Subscription, outage, and support tools tailored for FibreHub customers.",
    customerIdPrefix: "FH",
    fallbackSubdomain: "fibrehub.vux.ng",
    customDomains: ["selfcare.fibrehub.net", "my.fibrehub.com"],
    supportPhone: "+234 809 FIBREHUB",
    supportWhatsApp: "+234 809 444 1212",
    supportEmail: "care@fibrehub.example",
    website: "https://fibrehub.example",
    officeAddress: "Gwarinpa, Abuja, Nigeria",
    welcomeMessage: "Everything your FibreHub account needs is here: pay, renew, escalate, and track service health.",
    supportMessage: "FibreHub Support is available for outage escalation, billing confirmation, and plan upgrades.",
    footerInformation: "FibreHub Customer Portal. Secure, branded, and tenant-isolated.",
    loginAppearance: "Corporate login experience with crisp blue contrast",
    dashboardAppearance: "Support-first operations dashboard",
    template: "corporate",
    themeMode: "light",
    showPoweredByVux: true,
    marketplaceName: "FibreHub Store",
    paymentInstructions: "Pay with card or transfer. FibreHub sends branded receipts after successful confirmation.",
    announcement: "A new 75 Mbps Plus plan is now available for qualified FibreHub estates.",
    socialLinks: [
      { label: "LinkedIn", url: "https://linkedin.example/fibrehub" },
      { label: "Facebook", url: "https://facebook.example/fibrehub" },
    ],
    theme: {
      primary: "#0f766e",
      secondary: "#155eef",
      accent: "#2dd4bf",
      background: "#edfdfa",
      surface: "#ffffff",
      surfaceMuted: "#f3fffd",
      text: "#134e4a",
      textMuted: "#5b7c78",
      border: "#cceee8",
      success: "#0f9f6e",
      warning: "#ca8a04",
      danger: "#dc2626",
      heroFrom: "#14b8a6",
      heroVia: "#0f766e",
      heroTo: "#67e8f9",
    },
    features: defaultFeatures({
      supportChat: true,
      marketplace: false,
      technicianBooking: true,
      deviceInfo: true,
      referrals: true,
    }),
  },
  "tenant-fibreone-003": {
    tenantId: "tenant-fibreone-003",
    slug: "fibreone",
    portalName: "FibreOne Customer Hub",
    portalTitle: "FibreOne Demo Portal",
    portalSubtitle: "A premium self-care experience with focused billing and service tools.",
    customerIdPrefix: "FO",
    fallbackSubdomain: "fibreone.vux.ng",
    customDomains: ["customers.fibreone.com"],
    supportPhone: "+234 801 FIBREONE",
    supportWhatsApp: "+234 801 555 8181",
    supportEmail: "support@fibreone.example",
    website: "https://fibreone.example",
    officeAddress: "Victoria Island, Lagos, Nigeria",
    welcomeMessage: "Welcome to FibreOne. Your account, payments, support, and notifications are all in one place.",
    supportMessage: "Need help? FibreOne support handles service issues, renewals, and customer care from this portal.",
    footerInformation: "FibreOne Demo Portal. Premium white-label experience powered by VUX.",
    loginAppearance: "Premium telecom login with bright gradient framing",
    dashboardAppearance: "Telecom-inspired dashboard with compact actions",
    template: "telecom",
    themeMode: "light",
    showPoweredByVux: false,
    marketplaceName: "FibreOne Shop",
    paymentInstructions: "FibreOne supports card payment, transfer proofing, and branded invoice downloads.",
    announcement: "FibreOne customers in VI now have access to same-day technician booking.",
    socialLinks: [
      { label: "YouTube", url: "https://youtube.example/fibreone" },
    ],
    theme: {
      primary: "#7c3aed",
      secondary: "#ec4899",
      accent: "#f97316",
      background: "#f7f2ff",
      surface: "#ffffff",
      surfaceMuted: "#fcf7ff",
      text: "#4c1d95",
      textMuted: "#7c6a9d",
      border: "#eadcff",
      success: "#16a34a",
      warning: "#ea580c",
      danger: "#dc2626",
      heroFrom: "#8b5cf6",
      heroVia: "#ec4899",
      heroTo: "#fb923c",
    },
    features: defaultFeatures({
      supportChat: false,
      marketplace: true,
      technicianBooking: true,
      documents: true,
      deviceInfo: true,
      referrals: true,
    }),
  },
};

export const defaultPortalTenantId = "tenant-west-001";

const queryTenantAliases: Record<string, string> = {
  jude: "tenant-west-001",
  westlink: "tenant-west-001",
  fibrehub: "tenant-north-002",
  northwave: "tenant-north-002",
  fibreone: "tenant-fibreone-003",
};

export function getPortalConfig(tenantId?: string) {
  return portalTenantConfigs[tenantId ?? ""] ?? portalTenantConfigs[defaultPortalTenantId];
}

export function resolvePortalTenantId(payload: {
  hostname?: string;
  search?: string;
  identity?: string;
  sessionTenantId?: string;
}) {
  const identity = payload.identity?.trim().toUpperCase() ?? "";
  if (payload.sessionTenantId && portalTenantConfigs[payload.sessionTenantId]) {
    return payload.sessionTenantId;
  }

  const query = new URLSearchParams(payload.search ?? "");
  const tenantIdParam = query.get("tenantId")?.trim();
  if (tenantIdParam && portalTenantConfigs[tenantIdParam]) {
    return tenantIdParam;
  }
  const ispParam = query.get("isp")?.trim().toLowerCase();
  if (ispParam && queryTenantAliases[ispParam]) {
    return queryTenantAliases[ispParam];
  }

  const hostname = payload.hostname?.toLowerCase() ?? "";
  const hostMatch = Object.values(portalTenantConfigs).find((config) =>
    [config.fallbackSubdomain, ...config.customDomains].some((domain) => hostname.includes(domain.toLowerCase()) || hostname.startsWith(`${config.slug}.`)),
  );
  if (hostMatch) {
    return hostMatch.tenantId;
  }

  const prefixMatch = Object.values(portalTenantConfigs).find((config) => identity.startsWith(config.customerIdPrefix.toUpperCase()));
  if (prefixMatch) {
    return prefixMatch.tenantId;
  }

  return defaultPortalTenantId;
}

export function getPortalTenantStyle(config: TenantPortalConfig) {
  return {
    "--portal-primary": config.theme.primary,
    "--portal-secondary": config.theme.secondary,
    "--portal-accent": config.theme.accent,
    "--portal-background": config.theme.background,
    "--portal-surface": config.theme.surface,
    "--portal-surface-muted": config.theme.surfaceMuted,
    "--portal-text": config.theme.text,
    "--portal-text-muted": config.theme.textMuted,
    "--portal-border": config.theme.border,
    "--portal-success": config.theme.success,
    "--portal-warning": config.theme.warning,
    "--portal-danger": config.theme.danger,
    "--portal-hero-from": config.theme.heroFrom,
    "--portal-hero-via": config.theme.heroVia,
    "--portal-hero-to": config.theme.heroTo,
  } as Record<string, string>;
}

export const portalNavigation = [
  { id: "overview", label: "Home", feature: null },
  { id: "internet", label: "My Internet", feature: "usage" },
  { id: "billing", label: "Payments", feature: "payments" },
  { id: "invoices", label: "Invoices", feature: "invoices" },
  { id: "support", label: "Support", feature: "supportTickets" },
  { id: "outages", label: "Outages", feature: "outages" },
  { id: "marketplace", label: "Marketplace", feature: "marketplace" },
  { id: "profile", label: "Profile", feature: null },
] as const;
