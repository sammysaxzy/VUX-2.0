"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import {
  parseBooleanCell,
  parseIsoDateCell,
  parseNumberCell,
  normalizeRadiusImportRow,
} from "@/features/import-export/utils";
import {
  RADIUS_USER_IMPORT_EXPORT_SCHEMA,
  type RadiusBulkImportPayload,
  type RadiusImportFailure,
  type RadiusImportRow,
} from "@/features/import-export/schema";

const CHUNK_SIZE = 250;

type ParserOptions = {
  existingUsernames: string[];
  validNasIds: string[];
};

type ParserState = {
  fileName: string;
  previewRows: RadiusImportRow[];
  importRows: Array<{ rowNumber: number; raw: RadiusImportRow; payload: RadiusBulkImportPayload }>;
  failedRows: RadiusImportFailure[];
  payload: RadiusBulkImportPayload[];
  totalRows: number;
};

const emptyState: ParserState = {
  fileName: "",
  previewRows: [],
  importRows: [],
  failedRows: [],
  payload: [],
  totalRows: 0,
};

const waitForPaint = () => new Promise<void>((resolve) => window.setTimeout(resolve, 0));

export function useCSVParser({ existingUsernames, validNasIds }: ParserOptions) {
  const [state, setState] = useState<ParserState>(emptyState);
  const [isParsing, setIsParsing] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const reset = () => {
    setState(emptyState);
    setFileError(null);
    setIsParsing(false);
  };

  const parseFile = async (file: File) => {
    setIsParsing(true);
    setFileError(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", raw: false, dense: true });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(firstSheet, {
        header: 1,
        defval: "",
        blankrows: false,
      });

      if (!rows.length) {
        throw new Error("The selected file is empty.");
      }

      const headers = (rows[0] ?? []).map((value) => String(value).trim());
      const exactHeaders =
        headers.length === RADIUS_USER_IMPORT_EXPORT_SCHEMA.length &&
        headers.every((header, index) => header === RADIUS_USER_IMPORT_EXPORT_SCHEMA[index]);

      if (!exactHeaders) {
        throw new Error("Invalid headers. The file must match the required schema exactly.");
      }

      const dataRows = rows.slice(1).filter((row) => row.some((cell) => String(cell ?? "").trim().length > 0));
      if (!dataRows.length) {
        throw new Error("The selected file does not contain any data rows.");
      }

      const seenUsernames = new Set(existingUsernames.map((username) => username.trim().toLowerCase()));
      const validNasSet = new Set(validNasIds.map((nasId) => nasId.trim().toLowerCase()));
      const previewRows = dataRows.slice(0, 5).map((row) => normalizeRadiusImportRow(RADIUS_USER_IMPORT_EXPORT_SCHEMA, row));
      const failures: RadiusImportFailure[] = [];
      const payload: RadiusBulkImportPayload[] = [];
      const importRows: Array<{ rowNumber: number; raw: RadiusImportRow; payload: RadiusBulkImportPayload }> = [];

      for (let index = 0; index < dataRows.length; index += CHUNK_SIZE) {
        const chunk = dataRows.slice(index, index + CHUNK_SIZE);
        for (const [chunkOffset, row] of chunk.entries()) {
          const rowNumber = index + chunkOffset + 2;
          const normalized = normalizeRadiusImportRow(RADIUS_USER_IMPORT_EXPORT_SCHEMA, row);
          const username = normalized.username.trim();
          const password = normalized.password.trim();
          const nasId = normalized.nasid.trim();
          const normalizedUsername = username.toLowerCase();

          if (!username || !password) {
            failures.push({ rowNumber, username, reason: "Username and password are required.", raw: normalized });
            continue;
          }

          if (!nasId) {
            failures.push({ rowNumber, username, reason: "NAS ID is required.", raw: normalized });
            continue;
          }

          if (seenUsernames.has(normalizedUsername)) {
            failures.push({ rowNumber, username, reason: "Duplicate username skipped.", raw: normalized });
            continue;
          }

          if (!validNasSet.has(nasId.toLowerCase())) {
            failures.push({ rowNumber, username, reason: "Invalid NAS ID.", raw: normalized });
            continue;
          }

          const enabled = parseBooleanCell(normalized.enableuser);
          if (enabled === null) {
            failures.push({ rowNumber, username, reason: "enableuser must be a boolean value.", raw: normalized });
            continue;
          }

          const archived = parseBooleanCell(normalized.archived);
          if (archived === null) {
            failures.push({ rowNumber, username, reason: "archived must be a boolean value.", raw: normalized });
            continue;
          }

          const gpsLat = parseNumberCell(normalized.gpslat);
          if (gpsLat === null) {
            failures.push({ rowNumber, username, reason: "gpslat must be a valid number.", raw: normalized });
            continue;
          }

          const gpsLong = parseNumberCell(normalized.gpslong);
          if (gpsLong === null) {
            failures.push({ rowNumber, username, reason: "gpslong must be a valid number.", raw: normalized });
            continue;
          }

          const expiration = parseIsoDateCell(normalized.expiration);
          if (expiration === null) {
            failures.push({ rowNumber, username, reason: "expiration must be a valid date.", raw: normalized });
            continue;
          }

          const parsedPayload = {
            username,
            password,
            nas_id: nasId,
            enabled,
            name: normalized.name || undefined,
            customer_id: normalized.customerid || undefined,
            company: normalized.company || undefined,
            email: normalized.email || undefined,
            phone: normalized.phone || undefined,
            mobile: normalized.mobile || undefined,
            address: normalized.address || undefined,
            city: normalized.city || undefined,
            country: normalized.country || undefined,
            state: normalized.state || undefined,
            comment: normalized.comment || undefined,
            gps_lat: gpsLat,
            gps_long: gpsLong,
            mac: normalized.mac || undefined,
            expiration,
            service_id: normalized.srvid || undefined,
            static_ip: normalized.staticip || undefined,
            created_by: normalized.createdby || undefined,
          };

          payload.push(parsedPayload);
          importRows.push({ rowNumber, raw: normalized, payload: parsedPayload });

          seenUsernames.add(normalizedUsername);
        }

        await waitForPaint();
      }

      setState({
        fileName: file.name,
        previewRows,
        importRows,
        failedRows: failures,
        payload,
        totalRows: dataRows.length,
      });
    } catch (error) {
      setState(emptyState);
      setFileError(error instanceof Error ? error.message : "Unable to parse the selected file.");
    } finally {
      setIsParsing(false);
    }
  };

  return {
    ...state,
    isParsing,
    fileError,
    hasImportableRows: state.payload.length > 0,
    reset,
    parseFile,
  };
}
