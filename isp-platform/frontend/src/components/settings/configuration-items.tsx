import type { ReactNode } from "react";
import {
  BellRing,
  CreditCard,
  Globe,
  Mail,
  MessageSquareText,
  ReceiptText,
  Settings2,
  ShieldCheck,
  UserCog,
} from "lucide-react";

export type ConfigurationSection =
  | "admin"
  | "portal"
  | "billing"
  | "mail"
  | "payment"
  | "sms"
  | "notification"
  | "auto-user"
  | "whatsapp";

export type ConfigurationItem = {
  slug: ConfigurationSection;
  label: string;
  description: string;
  icon: ReactNode;
  sections: Array<{
    title: string;
    description: string;
    fields: Array<
      | { type: "text" | "email" | "password"; id: string; label: string; placeholder?: string }
      | { type: "select"; id: string; label: string; options: string[] }
      | { type: "toggle"; id: string; label: string; helper: string }
      | { type: "textarea"; id: string; label: string; placeholder?: string }
    >;
  }>;
};

export const configurationItems: ConfigurationItem[] = [
  {
    slug: "admin",
    label: "Admin",
    description: "Manage system administrators, roles, and privileged access controls.",
    icon: <ShieldCheck className="h-5 w-5" />,
    sections: [
      {
        title: "Administrator Access",
        description: "Control who can access the global control plane and how elevated privileges are granted.",
        fields: [
          { type: "text", id: "primary-admin", label: "Primary Admin Name", placeholder: "NOC Superintendent" },
          { type: "email", id: "primary-admin-email", label: "Primary Admin Email", placeholder: "admin@isp.com" },
          { type: "select", id: "privilege-model", label: "Privilege Model", options: ["Role Based", "Approval Based", "Hybrid"] },
          { type: "toggle", id: "mfa-required", label: "Require MFA", helper: "Force multi-factor authentication for all admin roles." },
        ],
      },
    ],
  },
  {
    slug: "portal",
    label: "Portal",
    description: "Configure customer portal branding, login behavior, and entry experience.",
    icon: <Globe className="h-5 w-5" />,
    sections: [
      {
        title: "Branding and Login",
        description: "Set the global customer-facing portal identity and sign-in behavior.",
        fields: [
          { type: "text", id: "portal-name", label: "Portal Display Name", placeholder: "WestLink Self Care" },
          { type: "text", id: "portal-logo", label: "Logo URL", placeholder: "https://cdn.example.com/logo.png" },
          { type: "text", id: "portal-primary-color", label: "Primary Brand Color", placeholder: "#0B7285" },
          { type: "select", id: "login-mode", label: "Login Mode", options: ["Email and Password", "Phone and OTP", "Username and Password"] },
        ],
      },
    ],
  },
  {
    slug: "billing",
    label: "Billing",
    description: "Define billing cycles, invoice generation, and tax handling policies.",
    icon: <ReceiptText className="h-5 w-5" />,
    sections: [
      {
        title: "Billing Rules",
        description: "Keep invoice timing and tax behavior consistent across the tenant.",
        fields: [
          { type: "select", id: "billing-cycle", label: "Default Billing Cycle", options: ["Monthly", "Quarterly", "Annually"] },
          { type: "text", id: "invoice-prefix", label: "Invoice Prefix", placeholder: "INV-" },
          { type: "text", id: "tax-rate", label: "Tax Rate (%)", placeholder: "7.5" },
          { type: "toggle", id: "proration-enabled", label: "Enable Proration", helper: "Apply prorated billing on mid-cycle plan changes." },
        ],
      },
    ],
  },
  {
    slug: "mail",
    label: "Mail",
    description: "Set SMTP delivery, sender identity, and mail authentication settings.",
    icon: <Mail className="h-5 w-5" />,
    sections: [
      {
        title: "SMTP Delivery",
        description: "Configure outbound email transport used for invoices, alerts, and onboarding.",
        fields: [
          { type: "text", id: "smtp-host", label: "SMTP Host", placeholder: "smtp.mailgun.org" },
          { type: "text", id: "smtp-port", label: "SMTP Port", placeholder: "587" },
          { type: "email", id: "sender-email", label: "Sender Email", placeholder: "no-reply@isp.com" },
          { type: "password", id: "smtp-password", label: "SMTP Password", placeholder: "••••••••" },
        ],
      },
    ],
  },
  {
    slug: "payment",
    label: "Payment",
    description: "Connect payment gateways and store settlement credentials securely.",
    icon: <CreditCard className="h-5 w-5" />,
    sections: [
      {
        title: "Gateway Integration",
        description: "Register the default online payment processor and associated credentials.",
        fields: [
          { type: "select", id: "payment-gateway", label: "Gateway", options: ["Paystack", "Flutterwave", "Manual Transfer"] },
          { type: "text", id: "public-key", label: "Public Key", placeholder: "pk_live_xxx" },
          { type: "password", id: "secret-key", label: "Secret Key", placeholder: "sk_live_xxx" },
          { type: "toggle", id: "auto-reconcile", label: "Enable Auto Reconciliation", helper: "Match successful payments to invoices automatically." },
        ],
      },
    ],
  },
  {
    slug: "sms",
    label: "SMS",
    description: "Set up SMS providers, sender identity, and delivery credentials.",
    icon: <MessageSquareText className="h-5 w-5" />,
    sections: [
      {
        title: "SMS Gateway",
        description: "Configure the primary SMS provider used for OTPs and customer alerts.",
        fields: [
          { type: "text", id: "sms-provider", label: "Provider Name", placeholder: "Termii" },
          { type: "password", id: "sms-api-key", label: "API Key", placeholder: "••••••••" },
          { type: "text", id: "sender-id", label: "Sender ID", placeholder: "WESTLINK" },
          { type: "toggle", id: "sms-delivery-report", label: "Delivery Reports", helper: "Track gateway delivery callbacks in logs." },
        ],
      },
    ],
  },
  {
    slug: "notification",
    label: "Notification",
    description: "Control email and SMS alert rules plus event-driven notification triggers.",
    icon: <BellRing className="h-5 w-5" />,
    sections: [
      {
        title: "Event Triggers",
        description: "Choose how system events fan out to customers and operations teams.",
        fields: [
          { type: "toggle", id: "notify-payment-success", label: "Payment Success Alerts", helper: "Notify customers immediately after successful payment." },
          { type: "select", id: "default-channel", label: "Default Channel", options: ["Email", "SMS", "Email and SMS"] },
          { type: "textarea", id: "notification-notes", label: "Internal Rules Notes", placeholder: "Escalation, quiet hours, and exception handling..." },
        ],
      },
    ],
  },
  {
    slug: "auto-user",
    label: "Auto User",
    description: "Define auto-provisioning and activation rules tied to customer lifecycle events.",
    icon: <UserCog className="h-5 w-5" />,
    sections: [
      {
        title: "Provisioning Automation",
        description: "Create default automation rules for account creation and payment-triggered activation.",
        fields: [
          { type: "toggle", id: "auto-create-radius", label: "Auto Create PPPoE Account", helper: "Create service credentials when a customer record is approved." },
          { type: "toggle", id: "auto-activate-payment", label: "Auto Activate on Payment", helper: "Activate accounts after successful invoice settlement." },
          { type: "select", id: "default-plan-template", label: "Default Plan Template", options: ["Residential", "Business", "Enterprise"] },
          { type: "textarea", id: "auto-user-conditions", label: "Provisioning Rules", placeholder: "Describe approval, payment, and service conditions..." },
        ],
      },
    ],
  },
  {
    slug: "whatsapp",
    label: "WhatsApp",
    description: "Manage WhatsApp API connectivity and reusable message templates.",
    icon: <Settings2 className="h-5 w-5" />,
    sections: [
      {
        title: "WhatsApp Integration",
        description: "Connect the business messaging channel used for payment and outage notices.",
        fields: [
          { type: "text", id: "whatsapp-phone-id", label: "Phone Number ID", placeholder: "1234567890" },
          { type: "password", id: "whatsapp-token", label: "Access Token", placeholder: "••••••••" },
          { type: "text", id: "template-namespace", label: "Template Namespace", placeholder: "westlink_prod" },
          { type: "textarea", id: "template-notes", label: "Template Notes", placeholder: "Payment reminder, outage, and welcome message templates..." },
        ],
      },
    ],
  },
];

export function getConfigurationItem(section?: string) {
  return configurationItems.find((item) => item.slug === section);
}
