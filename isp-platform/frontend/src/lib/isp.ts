import type { BillingInvoice, Customer, Fault, Role, WorkOrder } from "@/types";
import { formatCurrency } from "@/lib/utils";

export function getRoleLabel(role?: Role) {
  switch (role) {
    case "tenant_admin":
    case "isp_admin":
    case "admin":
    case "super_admin":
      return "Admin";
    case "noc":
    case "noc_engineer":
    case "noc_viewer":
      return "NOC";
    case "accountant":
    case "finance":
      return "Finance";
    case "field_engineer":
    case "engineer":
      return "Engineer";
    case "customer_care":
    case "support":
      return "Customer Care";
    case "manager":
      return "Manager";
    case "store_manager":
      return "Inventory";
    default:
      return "Team Member";
  }
}

export function getCustomerPlanLabel(customer: Customer) {
  return customer.planName ?? customer.slaTier?.toUpperCase() ?? "Unassigned";
}

export function getCustomerPaymentStatus(customer: Customer) {
  if (customer.paymentStatus) return customer.paymentStatus;
  if ((customer.balance ?? 0) > 0) return "overdue";
  return "paid";
}

export function getCustomerSignalHealth(customer: Customer) {
  if (!customer.online || customer.rxSignal <= -28) return "critical";
  if (customer.rxSignal <= -24) return "warning";
  return "healthy";
}

export function getCustomerStatusTone(customer: Customer): "success" | "warning" | "danger" {
  if (customer.accountStatus === "suspended") return "warning";
  return customer.online ? "success" : "danger";
}

export function buildCustomerServiceLabel(customer: Customer) {
  return customer.serviceLocation ?? customer.address;
}

export function buildInvoiceFromCustomer(customer: Customer): BillingInvoice {
  const amount = customer.monthlyFee ?? 0;
  const balance = Math.max(customer.balance ?? 0, 0);
  const status = customer.paymentStatus ?? (balance > 0 ? "overdue" : "paid");
  const dueDate =
    customer.nextInvoiceDate ??
    new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();

  return {
    id: `inv-${customer.id}`,
    customerId: customer.id,
    customerName: customer.name,
    planName: getCustomerPlanLabel(customer),
    amount,
    balance,
    status: status === "pending" ? "issued" : status,
    issuedAt: customer.lastPaymentDate ?? new Date().toISOString(),
    dueDate,
    paidAt: status === "paid" ? customer.lastPaymentDate : undefined,
    reference: customer.paymentReference ?? `VUX-${customer.id.toUpperCase()}`,
    paymentMethod: status === "paid" ? "paystack" : "bank_transfer",
    paymentGateway: "paystack",
    notes:
      "Use live Paystack transaction initialization on backend before production checkout.",
  };
}

export function countAffectedCustomers(cableId: string, customers: Customer[]) {
  return customers.filter((customer) => customer.dropCableId === cableId || customer.fibreCoreId === cableId).length;
}

export function getFaultImpact(fault: Fault, customers: Customer[]) {
  const affected = customers.filter(
    (customer) => customer.dropCableId === fault.affectedCableId || customer.mstId === fault.affectedNodeId,
  );
  return affected;
}

export function getWorkOrderStatusTone(workOrder: WorkOrder): "success" | "danger" | "warning" | "outline" {
  if (workOrder.status === "completed") return "success";
  if (workOrder.status === "cancelled") return "danger";
  if (workOrder.approval_status === "pending" || workOrder.status === "in_progress") return "warning";
  return "outline";
}

export function getInvoiceSummary(invoices: BillingInvoice[]) {
  return {
    total: invoices.length,
    overdue: invoices.filter((invoice) => invoice.status === "overdue").length,
    paid: invoices.filter((invoice) => invoice.status === "paid").length,
    outstandingAmount: invoices.reduce((sum, invoice) => sum + invoice.balance, 0),
    billedAmount: invoices.reduce((sum, invoice) => sum + invoice.amount, 0),
  };
}

export function formatPlanAndFee(customer: Customer) {
  const plan = getCustomerPlanLabel(customer);
  if (!customer.monthlyFee) return plan;
  return `${plan} • ${formatCurrency(customer.monthlyFee)}/mo`;
}
