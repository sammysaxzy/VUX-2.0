import type { Customer, OnuTelemetryPayload } from "@/types";
import { randomId } from "@/lib/utils";

export function buildCustomerFromTelemetry(
  payload: OnuTelemetryPayload,
  existing?: Customer,
  tenantId = existing?.tenantId ?? "telemetry",
): Customer {
  return {
    id: existing?.id ?? randomId("cust"),
    tenantId,
    name: existing?.name ?? (payload.pppoe_username ? `ONU ${payload.pppoe_username}` : "ONU Telemetry"),
    email: existing?.email ?? "",
    phone: existing?.phone ?? "",
    address: existing?.address ?? "",
    location: payload.location ?? existing?.location ?? { lat: 0, lng: 0 },
    onuSerial: payload.serial_number,
    onuVendor: payload.brand ?? existing?.onuVendor ?? "Unknown",
    onuModel: existing?.onuModel ?? "Unknown",
    routerBrand: payload.router_type ? "Field" : existing?.routerBrand,
    routerType: payload.router_type ?? existing?.routerType,
    deviceStatus: payload.status,
    lastSeenAt: payload.last_seen ?? new Date().toISOString(),
    uptimeMinutes: payload.uptime_minutes ?? existing?.uptimeMinutes,
    oltName: payload.olt_name ?? existing?.oltName ?? "OLT",
    ponPort: payload.pon_port ?? existing?.ponPort ?? "-",
    rxSignal: payload.rx_power ?? existing?.rxSignal ?? 0,
    txSignal: payload.tx_power ?? existing?.txSignal ?? 0,
    accountStatus: payload.status === "offline" ? "suspended" : "active",
    online: payload.status === "online",
    pppoeUsername: payload.pppoe_username ?? existing?.pppoeUsername,
    installStatus: existing?.installStatus ?? "pending",
  };
}
