export const RADIUS_USER_IMPORT_EXPORT_SCHEMA = [
  "id",
  "username",
  "password",
  "nasid",
  "enableuser",
  "name",
  "customerid",
  "company",
  "email",
  "phone",
  "mobile",
  "address",
  "city",
  "country",
  "state",
  "comment",
  "gpslat",
  "gpslong",
  "mac",
  "expiration",
  "srvid",
  "staticip",
  "createdby",
  "lastsync",
  "lastactive",
  "alertemail",
  "archived",
  "createdAt",
  "updatedAt",
  "customer",
  "Customer",
] as const;

export const RADIUS_SESSION_EXPORT_SCHEMA = [
  "username",
  "ip_address",
  "session_time",
  "status",
  "nas",
  "data_usage",
  "last_active",
] as const;

export const CUSTOMER_EXPORT_SCHEMA = [
  "customer_id",
  "name",
  "email",
  "phone",
  "address",
  "city",
  "country",
  "status",
  "createdAt",
] as const;

export type RadiusImportSchemaKey = (typeof RADIUS_USER_IMPORT_EXPORT_SCHEMA)[number];

export type RadiusImportRow = Record<RadiusImportSchemaKey, string>;

export type RadiusBulkImportPayload = {
  username: string;
  password: string;
  nas_id: string;
  enabled?: boolean;
  name?: string;
  customer_id?: string;
  company?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  city?: string;
  country?: string;
  state?: string;
  comment?: string;
  gps_lat?: number;
  gps_long?: number;
  mac?: string;
  expiration?: string;
  service_id?: string;
  static_ip?: string;
  created_by?: string;
};

export type RadiusImportFailure = {
  rowNumber: number;
  username: string;
  reason: string;
  raw: RadiusImportRow;
};

