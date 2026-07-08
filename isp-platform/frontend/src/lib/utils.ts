import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeDate(dateIso: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateIso));
}

export function formatDateOnly(dateIso: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(dateIso));
}

export function formatCurrency(amount: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateTimeOrDash(dateIso?: string) {
  if (!dateIso) return "Not available";
  return formatRelativeDate(dateIso);
}

export function formatDateOrDash(dateIso?: string) {
  if (!dateIso) return "Not available";
  return formatDateOnly(dateIso);
}

export function formatNumberOrDash(value?: number | null, suffix = "") {
  if (value === undefined || value === null || Number.isNaN(value)) return "Not available";
  return `${numberWithCommas(value)}${suffix}`;
}

export function toDateTimeLocalValue(dateIso: string) {
  const date = new Date(dateIso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export function isRadiusUserExpired(expirationDate: string, now = Date.now()) {
  return new Date(expirationDate).getTime() < now;
}

export function isRadiusUserExpiringSoon(expirationDate: string, now = Date.now(), windowDays = 3) {
  const expiry = new Date(expirationDate).getTime();
  const diff = expiry - now;
  return diff >= 0 && diff <= windowDays * 24 * 60 * 60 * 1000;
}

export function isReminderPending(expirationDate: string, reminderDays: number, now = Date.now()) {
  if (reminderDays < 1) return false;
  const expiry = new Date(expirationDate).getTime();
  const diff = expiry - now;
  return diff >= 0 && diff <= reminderDays * 24 * 60 * 60 * 1000;
}

export function numberWithCommas(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function titleCase(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function randomId(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}
