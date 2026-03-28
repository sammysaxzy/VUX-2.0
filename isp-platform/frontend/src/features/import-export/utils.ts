import * as XLSX from "xlsx";
import type { Customer, RadiusSession, RadiusUser } from "@/types";
import {
  CUSTOMER_EXPORT_SCHEMA,
  RADIUS_SESSION_EXPORT_SCHEMA,
  RADIUS_USER_IMPORT_EXPORT_SCHEMA,
  type RadiusImportFailure,
  type RadiusImportRow,
} from "@/features/import-export/schema";

export function createCsvContent(headers: readonly string[], rows: Array<Record<string, unknown>>) {
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: [...headers] });
  return XLSX.utils.sheet_to_csv(worksheet, { FS: ",", RS: "\n", strip: false });
}

export function downloadCsvFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function createRadiusImportErrorReport(failures: RadiusImportFailure[]) {
  const rows = failures.map((failure) => ({
    row_number: failure.rowNumber,
    username: failure.username,
    reason: failure.reason,
    ...failure.raw,
  }));
  return createCsvContent(["row_number", "username", "reason", ...RADIUS_USER_IMPORT_EXPORT_SCHEMA], rows);
}

export function mapRadiusUsersToExportRows(users: RadiusUser[]) {
  return users.map((user) => ({
    id: "",
    username: user.username,
    password: "",
    nasid: user.nasId,
    enableuser: user.status === "active",
    name: "",
    customerid: "",
    company: "",
    email: "",
    phone: "",
    mobile: "",
    address: "",
    city: "",
    country: "",
    state: "",
    comment: "",
    gpslat: "",
    gpslong: "",
    mac: "",
    expiration: user.expirationDate,
    srvid: user.plan,
    staticip: user.staticIp ?? "",
    createdby: "",
    lastsync: "",
    lastactive: user.lastSeen,
    alertemail: "",
    archived: false,
    createdAt: "",
    updatedAt: "",
    customer: "",
    Customer: "",
  }));
}

export function mapSessionsToExportRows(sessions: RadiusSession[]) {
  return sessions.map((session) => ({
    username: session.username,
    ip_address: session.ipAddress,
    session_time: session.duration ?? "",
    status: session.status,
    nas: session.customerId,
    data_usage: session.dataUsage ?? "",
    last_active: session.lastUpdated ?? session.startedAt,
  }));
}

export function mapCustomersToExportRows(customers: Customer[]) {
  return customers.map((customer) => ({
    customer_id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    address: customer.address,
    city: "",
    country: "",
    status: customer.accountStatus,
    createdAt: "",
  }));
}

export async function normalizeExportBlob(
  blob: Blob,
  fallbackHeaders: readonly string[],
  fallbackRows: Array<Record<string, unknown>>,
) {
  const contentType = blob.type.toLowerCase();
  if (contentType.includes("json")) {
    const payload = JSON.parse(await blob.text()) as Array<Record<string, unknown>>;
    return new Blob([createCsvContent(fallbackHeaders, payload)], { type: "text/csv;charset=utf-8;" });
  }
  if (contentType.includes("csv") || contentType.includes("plain") || !contentType) {
    const text = await blob.text();
    const hasContent = text.trim().length > 0;
    return new Blob([hasContent ? text : createCsvContent(fallbackHeaders, fallbackRows)], { type: "text/csv;charset=utf-8;" });
  }
  return new Blob([createCsvContent(fallbackHeaders, fallbackRows)], { type: "text/csv;charset=utf-8;" });
}

export function normalizeRadiusImportRow(headers: readonly string[], values: unknown[]): RadiusImportRow {
  return headers.reduce((accumulator, header, index) => {
    const value = values[index];
    accumulator[header as keyof RadiusImportRow] = value == null ? "" : String(value).trim();
    return accumulator;
  }, {} as RadiusImportRow);
}

export function parseBooleanCell(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (["true", "1", "yes"].includes(normalized)) return true;
  if (["false", "0", "no"].includes(normalized)) return false;
  return null;
}

export function parseNumberCell(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseIsoDateCell(value: string) {
  if (!value.trim()) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

